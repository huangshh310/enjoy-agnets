/**
 * 规则种类筛选与卡片徽标。展示文案集中在这里，避免 JSX 里叠三元。
 */
import type { AgentRuleKind } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

const KIND_BADGE: Record<string, { short: string; className: string }> = {
  cursor_mdc: {
    short: "MDC",
    className: "bg-accent-500/10 text-accent-500 dark:text-accent-500"
  },
  claude_md: {
    short: "CLD",
    className: "bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text"
  },
  copilot: {
    short: "COP",
    className: "bg-state-success-text/10 text-state-success-text dark:text-state-success-text"
  }
}

const FALLBACK_BADGE = {
  short: "AGT",
  className: "bg-chart-5/10 text-chart-5 dark:text-chart-5"
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
