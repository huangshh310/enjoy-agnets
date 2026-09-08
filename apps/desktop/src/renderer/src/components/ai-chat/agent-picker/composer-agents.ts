/**
 * Composer 左栏要展示的 Agent。技能位不出现；即将推出沉到底。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"

const TAB_ORDER = [
  "enjoy-local",
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "hermes",
  "amp",
  "deepseek",
  "omp"
] as const

export function composerAgentTabs(tools: AgentToolPublic[]): AgentToolPublic[] {
  const byId = new Map(tools.filter((item) => !item.skillOnly).map((item) => [item.id, item]))
  return TAB_ORDER.map((id) => byId.get(id)).filter((item): item is AgentToolPublic => Boolean(item))
}

export function composerAgentGroups(tools: AgentToolPublic[]): {
  primary: AgentToolPublic[]
  soon: AgentToolPublic[]
} {
  const tabs = composerAgentTabs(tools)
  return {
    primary: tabs.filter((item) => !item.comingSoon),
    soon: tabs.filter((item) => item.comingSoon)
  }
}

/** 触发器优先写模型名（对标 MonoCode），没有模型再写 Agent 名。 */
export function triggerLabel(runtimeId: string, agentLabel: string, modelLabel: string): string {
  if (runtimeId === DEFAULT_RUNTIME_ID) return modelLabel || agentLabel
  return modelLabel || agentLabel
}

export function cliModelLabel(agent: AgentToolPublic | undefined): string {
  if (!agent?.selectedModel) return ""
  return agent.models.find((item) => item.id === agent.selectedModel)?.label ?? agent.selectedModel
}
