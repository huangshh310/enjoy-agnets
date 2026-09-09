/**
 * 哪些项目规则会进 Enjoy Local 系统提示（以及检查器 system 桶）。
 * 带 globs 且未 alwaysApply 的不注入，避免每轮塞完整 contextual 表。
 */
import type { ProjectRuleItem } from "./rules.ts"

/** 常驻规则注入字符上限（含标题）。超了截断并注明省略条数。 */
export const ALWAYS_ON_RULES_CHAR_BUDGET = 24_000

/** 无 globs 的 workspace/global，或 frontmatter alwaysApply: true。 */
export function isAlwaysOnRule(rule: ProjectRuleItem): boolean {
  const content = rule.content ?? ""
  if (frontmatterFlag(content, "alwaysApply", true)) return true
  if (rule.globs?.trim()) return false
  if (rule.scope === "global" || rule.scope === "workspace") return true
  // .cursor/rules 扫描常标 contextual；无 globs 仍当常驻
  return !frontmatterFlag(content, "alwaysApply", false)
}

export function pickAlwaysOnRules(rules: readonly ProjectRuleItem[]): ProjectRuleItem[] {
  return rules.filter(isAlwaysOnRule).sort(compareAlwaysOnRank)
}

/** 拼进系统提示的正文；调用方传入扫描全表即可。 */
export function formatAlwaysOnRulePrompt(
  rules: readonly ProjectRuleItem[],
  budget = ALWAYS_ON_RULES_CHAR_BUDGET
): string {
  const selected = pickAlwaysOnRules(rules)
  const header = "# Project rules (always-on)"
  if (selected.length === 0) return ""
  let remaining = Math.max(0, budget - header.length - 2)
  const parts = [header]
  let omitted = 0
  for (let index = 0; index < selected.length; index += 1) {
    const body = stripRuleFrontmatter(selected[index]?.content ?? "").trim()
    if (!body) continue
    const block = `## ${selected[index]?.name ?? "rule"}\n${body}`
    if (block.length + 2 <= remaining) {
      parts.push(block)
      remaining -= block.length + 2
      continue
    }
    if (remaining > 200) {
      parts.push(`${block.slice(0, remaining - 1)}…`)
      remaining = 0
    }
    omitted = selected.length - index
    break
  }
  if (omitted > 0) {
    parts.push(`[truncated: ${omitted} always-on rule(s) exceeded character budget]`)
  }
  return parts.length > 1 ? parts.join("\n\n") : ""
}

export function stripRuleFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
}

function frontmatterFlag(content: string, key: string, value: boolean): boolean {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match?.[1]) return false
  return new RegExp(`^\\s*${key}:\\s*${value}\\s*$`, "im").test(match[1])
}

function compareAlwaysOnRank(left: ProjectRuleItem, right: ProjectRuleItem): number {
  return alwaysOnRank(left) - alwaysOnRank(right)
}

function alwaysOnRank(rule: ProjectRuleItem): number {
  const path = rule.filePath.replace(/\\/g, "/").toLowerCase()
  if (path.endsWith("agents.md") && rule.agentKind === "agents_md") return 0
  if (rule.scope === "workspace") return 1
  if (rule.scope === "global") return 2
  return 3
}
