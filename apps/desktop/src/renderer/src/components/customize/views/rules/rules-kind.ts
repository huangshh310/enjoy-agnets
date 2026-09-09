/**
 * 规则种类筛选与卡片徽标。展示文案集中在这里，避免 JSX 里叠三元。
 */
import type { AgentRuleKind } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

const KIND_BADGE: Record<string, { short: string; className: string }> = {
  cursor_mdc: {
    short: "MDC",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
  },
  claude_md: {
    short: "CLD",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  },
  copilot: {
    short: "COP",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  }
}

const FALLBACK_BADGE = {
  short: "AGT",
  className: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
}

const CREATE_KIND_LABEL: Record<string, string> = {
  cursor_mdc: "Cursor MDC",
  agents_md: "AGENTS.md",
  claude_md: "Claude",
  copilot: "Copilot",
  windsurf: "Windsurf",
  global: "Global"
}

export const CREATE_RULE_KINDS = [
  "cursor_mdc",
  "agents_md",
  "claude_md",
  "copilot",
  "windsurf",
  "global"
] as const satisfies readonly AgentRuleKind[]

export function getAgentKindFilters(t: TranslateFn): Array<{ id: string; label: string }> {
  return [
    { id: "all", label: t("studio.rules.filterAll") },
    { id: "cursor_mdc", label: "Cursor MDC" },
    { id: "agents_md", label: "AGENTS.md" },
    { id: "claude_md", label: "Claude Code" },
    { id: "copilot", label: "GitHub Copilot" },
    { id: "windsurf", label: "Windsurf" }
  ]
}

export function ruleKindBadge(kind: string): { short: string; className: string } {
  return KIND_BADGE[kind] ?? FALLBACK_BADGE
}

export function createKindLabel(kind: AgentRuleKind): string {
  return CREATE_KIND_LABEL[kind] ?? kind
}
