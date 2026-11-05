/**
 * Agent 技能包 (Skills) 本地扫描、发现与管理服务：
 * 自动扫描用户全局目录 (~/.enjoy-agents/skills, ~/.agents/skills 等) 与工作区目录，
 * 解析 SKILL.md YAML Frontmatter，并提供脚手架创建与文件管理器定位。
 * frontmatter 对齐 Agent Skills 规范校验；`allowed-tools` 仅展示；不合规不删盘。
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve, basename } from "node:path"
import { createRequire } from "node:module"
import type { Shell } from "electron"
import type { SkillFrontmatterIssue, SkillItem, SkillScope } from "@enjoy-agents/ipc-contract"
import { validateSkillFrontmatter } from "@enjoy-agents/ipc-contract"
import {
  assertAllowedSkillFile,
  assertAllowedSkillPackage,
  globalSkillRoots,
  workspaceSkillRoots
} from "./customize-roots.ts"

const req = createRequire(import.meta.url)

export type ParsedSkillFile = {
  name: string
  description?: string
  /** frontmatter 真值 description（合规判定用；展示回落不算已合规） */
  frontmatterDescription?: string
  trigger?: string
  /** 仅展示元数据；绝不喂审批 */
  allowedTools?: string
  compatibility?: string
  issues: SkillFrontmatterIssue[]
  content: string
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "")
}

function readFrontmatterField(frontmatter: string, key: string): string | undefined {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m")
  const match = frontmatter.match(re)
  if (!match?.[1]) return undefined
  const raw = stripQuotes(match[1])
  return raw.length > 0 ? raw : undefined
}

/** 解析 SKILL.md 顶部的 YAML Frontmatter，并附 Agent Skills 规范问题。 */
export function parseSkillFile(filePath: string): ParsedSkillFile {
  try {
    const raw = readFileSync(filePath, "utf-8")
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    let name = basename(resolve(filePath, ".."))
    let frontmatterDescription: string | undefined
    let trigger: string | undefined
    let allowedTools: string | undefined
    let compatibility: string | undefined

    if (match?.[1]) {
      const frontmatter = match[1]
      const nameValue = readFrontmatterField(frontmatter, "name")
      if (nameValue) name = nameValue
      frontmatterDescription = readFrontmatterField(frontmatter, "description")
      trigger = readFrontmatterField(frontmatter, "trigger")
      // allowed-tools：仅展示字符串，绝不映射为批准
      allowedTools = readFrontmatterField(frontmatter, "allowed-tools")
      compatibility = readFrontmatterField(frontmatter, "compatibility")
    }

    // 展示回落：Frontmatter 缺 description 时用正文首个 #；合规仍以 frontmatter 真值为准
    let description = frontmatterDescription
    if (!description) {
      const headingMatch = raw.match(/^#+\s*(.+)/m)
      if (headingMatch?.[1]) description = headingMatch[1].trim()
    }

    const validation = validateSkillFrontmatter({
      name,
      description: frontmatterDescription,
      compatibility
    })

    return {
      name,
      description,
      frontmatterDescription,
      trigger,
      allowedTools,
      compatibility,
      issues: validation.issues,
      content: raw
    }
  } catch {
    const name = basename(resolve(filePath, ".."))
    const validation = validateSkillFrontmatter({ name, description: undefined })
    return { name, issues: validation.issues, content: "" }
  }
}

/** 扫描指定根目录下的所有技能包 */
export function scanSkillRoot(rootPath: string, scope: SkillScope): SkillItem[] {
  if (!existsSync(rootPath)) return []
  const items: SkillItem[] = []

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillDir = join(rootPath, entry.name)
      const possibleFiles = ["SKILL.md", "skill.md", "README.md"]
      let foundFile: string | null = null

      for (const f of possibleFiles) {
        const full = join(skillDir, f)
        if (existsSync(full) && statSync(full).isFile()) {
          foundFile = full
          break
        }
      }

      if (foundFile) {
        const parsed = parseSkillFile(foundFile)
        items.push({
          id: `${scope}:${entry.name}`,
          name: parsed.name,
          description: parsed.description,
          scope,
          directoryPath: skillDir,
          skillFilePath: foundFile,
          trigger: parsed.trigger,
          content: parsed.content,
          issues: parsed.issues.length > 0 ? parsed.issues : undefined,
          allowedTools: parsed.allowedTools
        })
      }
    }
  } catch (err) {
    console.error(`Failed to scan skill root: ${rootPath}`, err)
  }

  return items
}

/** 列出本机全局与当前工作区的所有技能 */
export function listInstalledSkills(input?: { workspacePath?: string }): SkillItem[] {
  const allSkills: SkillItem[] = []
  const seenPaths = new Set<string>()

  for (const root of globalSkillRoots()) {
    for (const skill of scanSkillRoot(root, "global")) {
      if (!seenPaths.has(skill.directoryPath.toLowerCase())) {
        seenPaths.add(skill.directoryPath.toLowerCase())
        allSkills.push(skill)
      }
    }
  }

  if (input?.workspacePath) {
    for (const root of workspaceSkillRoots(input.workspacePath)) {
      for (const skill of scanSkillRoot(root, "workspace")) {
        if (!seenPaths.has(skill.directoryPath.toLowerCase())) {
          seenPaths.add(skill.directoryPath.toLowerCase())
          allSkills.push(skill)
        }
      }
    }
  }

  return allSkills
}

/** 读取单个技能的完整内容。 */
export function readSkillContent(skillFilePath: string, workspaceRoots: string[] = []): string {
  const allowed = assertAllowedSkillFile(skillFilePath, workspaceRoots)
  if (!existsSync(allowed)) throw new Error("Skill file not found.")
  return readFileSync(allowed, "utf-8")
}

/**
 * 创建或安装新技能。workspace scope 必须带已信任的 workspacePath。
 * 合法才写入（fail-closed）；禁静默截断；新建禁 `_`。
 * 绝不因校验调用删盘。
 */
export function createSkillPackage(input: {
  name: string
  description?: string
  scope: SkillScope
  workspacePath?: string
  content?: string
}): SkillItem {
  const name = input.name.trim()
  const description = (input.description ?? "").trim()
  const validation = validateSkillFrontmatter({ name, description })
  if (!validation.ok) {
    const message = validation.issues.map((row) => row.message).join("；")
    throw new Error(message || "技能名称或描述不合规")
  }

  // 新建 slug：仅 [a-z0-9-]，禁 `_`（与 Agent Skills 一致）；不再洗白后静默落盘
  const safeName = name.toLowerCase()
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(safeName) || safeName.includes("_")) {
    throw new Error("名称只能用小写字母、数字和连字符")
  }

  const targetRoot =
    input.scope === "workspace"
      ? join(needWorkspace(input.workspacePath), ".agents", "skills")
      : join(homedir(), ".enjoy-agents", "skills")
  const skillDir = join(targetRoot, safeName)
  const skillFilePath = join(skillDir, "SKILL.md")
  const roots = input.scope === "workspace" ? [needWorkspace(input.workspacePath)] : []
  assertAllowedSkillFile(skillFilePath, roots)
  mkdirSync(skillDir, { recursive: true })

  const defaultContent =
    input.content ??
    `---
name: ${safeName}
description: ${description}
---

# ${safeName} Skill

Describe domain workflows, CLI toolchains, and context guidelines for the Agent here.
`
  writeFileSync(skillFilePath, defaultContent, "utf-8")
  const parsed = parseSkillFile(skillFilePath)
  return {
    id: `${input.scope}:${safeName}`,
    name: parsed.name,
    description: parsed.description ?? description,
    scope: input.scope,
    directoryPath: skillDir,
    skillFilePath,
    trigger: parsed.trigger,
    content: parsed.content,
    issues: parsed.issues.length > 0 ? parsed.issues : undefined,
    allowedTools: parsed.allowedTools
  }
}

function needWorkspace(workspacePath?: string): string {
  if (!workspacePath) throw new Error("Open a workspace first.")
  return workspacePath
}

/** 显式删除技能包。禁止因规范校验调用本函数。 */
export function deleteSkillPackage(
  directoryPath: string,
  workspaceRoots: string[] = [],
  home = homedir()
): boolean {
  const allowed = assertAllowedSkillPackage(directoryPath, workspaceRoots, home)
  if (!existsSync(allowed)) return false
  rmSync(allowed, { recursive: true, force: true })
  return true
}

export function revealSkillFolder(directoryPath: string, workspaceRoots: string[] = []): void {
  const allowed = assertAllowedSkillPackage(directoryPath, workspaceRoots)
  if (!existsSync(allowed)) return
  try {
    const electron = req("electron") as { shell: Shell }
    void electron.shell.openPath(allowed)
  } catch {
    // ignore
  }
}
