/**
 * 多 Agent 规则 (Project Rules) 自动扫描、发现与管理服务：
 * 深度兼容 AGENTS.md, CLAUDE.md, Cursor (.cursor/rules/*.mdc), Copilot, Windsurf 等生态。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join, basename } from "node:path"
import { createRequire } from "node:module"
import type { Shell } from "electron"
import type { AgentRuleKind, ProjectRuleItem, RuleScope } from "@enjoy-agents/ipc-contract"

const req = createRequire(import.meta.url)

/** 解析单个规则文件的 Frontmatter 与元数据 */
function parseRuleFile(
  filePath: string,
  defaultKind: AgentRuleKind,
  defaultKindLabel: string,
  scope: RuleScope
): ProjectRuleItem | null {
  if (!existsSync(filePath)) return null
  try {
    const raw = readFileSync(filePath, "utf-8")
    let name = basename(filePath).replace(/\.(mdc|md|txt)$/i, "")
    let description: string | undefined = undefined
    let globs: string | undefined = undefined

    // 尝试解析 YAML Frontmatter (例如 Cursor .mdc)
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (match && match[1]) {
      const frontmatter = match[1]
      const descMatch = frontmatter.match(/description:\s*(.+)/)
      if (descMatch && descMatch[1]) description = descMatch[1].trim().replace(/^["']|["']$/g, "")

      const globsMatch = frontmatter.match(/globs:\s*(.+)/)
      if (globsMatch && globsMatch[1]) globs = globsMatch[1].trim().replace(/^["']|["']$/g, "")
    }

    if (!description) {
      const headingMatch = raw.match(/^#+\s*(.+)/m)
      if (headingMatch && headingMatch[1]) {
        description = headingMatch[1].trim()
      } else {
        description = `Rule specification in ${basename(filePath)}`
      }
    }

    return {
      id: `${defaultKind}:${filePath.toLowerCase()}`,
      name: name === "AGENTS" ? "AGENTS.md Contract" : name === "CLAUDE" ? "CLAUDE.md Guide" : name,
      agentKind: defaultKind,
      agentKindLabel: defaultKindLabel,
      scope: globs ? "contextual" : scope,
      filePath,
      globs,
      description,
      content: raw
    }
  } catch {
    return null
  }
}

/** 扫描多 Agent 规范的单个文件夹下所有规则 */
function scanRuleDirectory(
  dirPath: string,
  kind: AgentRuleKind,
  kindLabel: string,
  scope: RuleScope
): ProjectRuleItem[] {
  if (!existsSync(dirPath)) return []
  const items: ProjectRuleItem[] = []
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!/\.(mdc|md)$/i.test(entry.name)) continue
      const fullPath = join(dirPath, entry.name)
      const parsed = parseRuleFile(fullPath, kind, kindLabel, scope)
      if (parsed) items.push(parsed)
    }
  } catch {
    // ignore
  }
  return items
}

/** 自动扫描发现当前电脑与工作区的所有可用 Agent 规则 */
export function listDiscoveredRules(input?: { workspacePath?: string }): ProjectRuleItem[] {
  const rules: ProjectRuleItem[] = []
  const seenPaths = new Set<string>()

  function addRule(item: ProjectRuleItem | null) {
    if (!item) return
    const key = item.filePath.toLowerCase()
    if (!seenPaths.has(key)) {
      seenPaths.add(key)
      rules.push(item)
    }
  }

  // 1. 扫描当前工作区内的各大 Agent 规范文件
  if (input?.workspacePath && existsSync(input.workspacePath)) {
    const ws = input.workspacePath

    // (1) 根目录通用/主契约
    addRule(parseRuleFile(join(ws, "AGENTS.md"), "agents_md", "AGENTS.md", "workspace"))
    addRule(parseRuleFile(join(ws, "CLAUDE.md"), "claude_md", "Claude Code", "workspace"))
    addRule(parseRuleFile(join(ws, "CODEX.md"), "codex", "Codex", "workspace"))
    addRule(parseRuleFile(join(ws, ".cursorrules"), "cursorrules", "Cursor Rules", "workspace"))
    addRule(parseRuleFile(join(ws, ".windsurfrules"), "windsurf", "Windsurf", "workspace"))
    addRule(parseRuleFile(join(ws, ".github", "copilot-instructions.md"), "copilot", "GitHub Copilot", "workspace"))

    // (2) Cursor MDC 上下文精准匹配规则 (.cursor/rules/*.mdc, *.md)
    for (const r of scanRuleDirectory(join(ws, ".cursor", "rules"), "cursor_mdc", "Cursor MDC", "contextual")) {
      addRule(r)
    }

    // (3) Enjoy / Agents 规则 (.agents/rules/*.md)
    for (const r of scanRuleDirectory(join(ws, ".agents", "rules"), "agents_md", "Agents Rule", "workspace")) {
      addRule(r)
    }

    // (4) Claude 规则 (.claude/rules/*.md)
    for (const r of scanRuleDirectory(join(ws, ".claude", "rules"), "claude_md", "Claude Rule", "workspace")) {
      addRule(r)
    }
  }

  // 2. 扫描全局主目录规则 (~/.enjoy-agents/rules, ~/.cursor/rules, ~/.claude/rules 等)
  const home = homedir()
  for (const r of scanRuleDirectory(join(home, ".enjoy-agents", "rules"), "global", "Global Rule", "global")) {
    addRule(r)
  }
  for (const r of scanRuleDirectory(join(home, ".cursor", "rules"), "cursor_mdc", "Cursor Global", "global")) {
    addRule(r)
  }
  for (const r of scanRuleDirectory(join(home, ".claude", "rules"), "claude_md", "Claude Global", "global")) {
    addRule(r)
  }
  addRule(parseRuleFile(join(home, ".omp", "agent", "AGENTS.md"), "global", "OMP Global", "global"))

  return rules
}

/** 读取指定规则的完整内容 */
export function readRuleContent(filePath: string): string {
  if (!existsSync(filePath)) throw new Error("Rule file not found.")
  return readFileSync(filePath, "utf-8")
}

/** 创建新规则并写入对应 Agent 规范文件 */
export function createRuleFile(input: {
  targetKind: AgentRuleKind
  name: string
  description?: string
  globs?: string
  content: string
  workspacePath?: string
}): ProjectRuleItem {
  const ws = input.workspacePath || process.cwd()
  let targetPath = ""
  let kindLabel = "Project Rule"

  const safeName = input.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")

  switch (input.targetKind) {
    case "cursor_mdc": {
      const dir = join(ws, ".cursor", "rules")
      mkdirSync(dir, { recursive: true })
      targetPath = join(dir, `${safeName}.mdc`)
      kindLabel = "Cursor MDC"
      break
    }
    case "agents_md": {
      targetPath = join(ws, "AGENTS.md")
      kindLabel = "AGENTS.md"
      break
    }
    case "claude_md": {
      targetPath = join(ws, "CLAUDE.md")
      kindLabel = "Claude Code"
      break
    }
    case "copilot": {
      const dir = join(ws, ".github")
      mkdirSync(dir, { recursive: true })
      targetPath = join(dir, "copilot-instructions.md")
      kindLabel = "GitHub Copilot"
      break
    }
    case "windsurf": {
      targetPath = join(ws, ".windsurfrules")
      kindLabel = "Windsurf"
      break
    }
    case "global":
    default: {
      const dir = join(homedir(), ".enjoy-agents", "rules")
      mkdirSync(dir, { recursive: true })
      targetPath = join(dir, `${safeName}.md`)
      kindLabel = "Global Rule"
      break
    }
  }

  let finalContent = input.content
  // 如果是 Cursor MDC，且带有 globs/description，自动补充 Frontmatter
  if (input.targetKind === "cursor_mdc" && !input.content.startsWith("---")) {
    finalContent = `---
description: ${input.description || input.name}
globs: ${input.globs || "*"}
alwaysApply: ${input.globs ? "false" : "true"}
---

${input.content}`
  }

  writeFileSync(targetPath, finalContent, "utf-8")

  return {
    id: `${input.targetKind}:${targetPath.toLowerCase()}`,
    name: input.name,
    agentKind: input.targetKind,
    agentKindLabel: kindLabel,
    scope: input.globs ? "contextual" : "workspace",
    filePath: targetPath,
    globs: input.globs,
    description: input.description,
    content: finalContent
  }
}

/** 删除指定规则文件 */
export function deleteRuleFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false
  rmSync(filePath, { force: true })
  return true
}

/** 在文件资源管理器中定位 */
export function revealRuleFile(filePath: string): void {
  if (existsSync(filePath)) {
    try {
      const electron = req("electron") as { shell: Shell }
      void electron.shell.showItemInFolder(filePath)
    } catch {
      // ignore in test
    }
  }
}
