/**
 * Agent 技能包 (Skills) 本地扫描、发现与管理服务：
 * 自动扫描用户全局目录 (~/.enjoy-agents/skills, ~/.agents/skills 等) 与工作区目录，
 * 解析 SKILL.md YAML Frontmatter，并提供脚手架创建与文件管理器定位。
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve, basename } from "node:path"
import { createRequire } from "node:module"
import type { Shell } from "electron"
import type { SkillItem, SkillScope } from "@enjoy-agents/ipc-contract"
import {
  assertAllowedSkillFile,
  assertAllowedSkillPackage,
  globalSkillRoots,
  workspaceSkillRoots
} from "./customize-roots.ts"

const req = createRequire(import.meta.url)

/** 解析 SKILL.md 顶部的 YAML Frontmatter */
function parseSkillFile(filePath: string): {
  name: string
  description?: string
  trigger?: string
  content: string
} {
  try {
    const raw = readFileSync(filePath, "utf-8")
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    let name = basename(resolve(filePath, ".."))
    let description: string | undefined = undefined
    let trigger: string | undefined = undefined

    if (match && match[1]) {
      const frontmatter = match[1]
      const nameMatch = frontmatter.match(/name:\s*(.+)/)
      if (nameMatch && nameMatch[1]) name = nameMatch[1].trim().replace(/^["']|["']$/g, "")

      const descMatch = frontmatter.match(/description:\s*(.+)/)
      if (descMatch && descMatch[1]) description = descMatch[1].trim().replace(/^["']|["']$/g, "")

      const triggerMatch = frontmatter.match(/trigger:\s*(.+)/)
      if (triggerMatch && triggerMatch[1]) trigger = triggerMatch[1].trim().replace(/^["']|["']$/g, "")
    }

    // 如果 Frontmatter 没提取到 description，尝试从正文首个 # 或首段提取
    if (!description) {
      const headingMatch = raw.match(/^#+\s*(.+)/m)
      if (headingMatch && headingMatch[1]) {
        description = headingMatch[1].trim()
      }
    }

    return { name, description, trigger, content: raw }
  } catch {
    return { name: basename(resolve(filePath, "..")), content: "" }
  }
}

/** 扫描指定根目录下的所有技能包 */
function scanRoot(rootPath: string, scope: SkillScope): SkillItem[] {
  if (!existsSync(rootPath)) return []
  const items: SkillItem[] = []

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillDir = join(rootPath, entry.name)
      // 检查该目录下是否存在 SKILL.md 或 skill.md
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
          content: parsed.content
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
    for (const skill of scanRoot(root, "global")) {
      if (!seenPaths.has(skill.directoryPath.toLowerCase())) {
        seenPaths.add(skill.directoryPath.toLowerCase())
        allSkills.push(skill)
      }
    }
  }

  if (input?.workspacePath) {
    for (const root of workspaceSkillRoots(input.workspacePath)) {
      for (const skill of scanRoot(root, "workspace")) {
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

/** 创建或安装新技能。workspace scope 必须带已信任的 workspacePath。 */
export function createSkillPackage(input: {
  name: string
  description?: string
  scope: SkillScope
  workspacePath?: string
  content?: string
}): SkillItem {
  const targetRoot =
    input.scope === "workspace"
      ? join(needWorkspace(input.workspacePath), ".agents", "skills")
      : join(homedir(), ".enjoy-agents", "skills")
  const safeName = input.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")
  const skillDir = join(targetRoot, safeName)
  const skillFilePath = join(skillDir, "SKILL.md")
  const roots = input.scope === "workspace" ? [needWorkspace(input.workspacePath)] : []
  assertAllowedSkillFile(skillFilePath, roots)
  mkdirSync(skillDir, { recursive: true })

  const defaultContent = input.content ?? `---
name: ${safeName}
description: ${input.description ?? "Custom agent skill"}
---

# ${input.name} Skill

Describe domain workflows, CLI toolchains, and context guidelines for the Agent here.
`
  writeFileSync(skillFilePath, defaultContent, "utf-8")
  return {
    id: `${input.scope}:${safeName}`,
    name: input.name,
    description: input.description,
    scope: input.scope,
    directoryPath: skillDir,
    skillFilePath,
    content: defaultContent
  }
}

function needWorkspace(workspacePath?: string): string {
  if (!workspacePath) throw new Error("Open a workspace first.")
  return workspacePath
}

export function deleteSkillPackage(directoryPath: string, workspaceRoots: string[] = []): boolean {
  const allowed = assertAllowedSkillPackage(directoryPath, workspaceRoots)
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
    // ignore in test
  }
}
