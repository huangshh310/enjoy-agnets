/**
 * Composer 左栏要展示的 Agent。技能位不出现；即将推出沉到底。
 */
import { composerChromeFor, isCustomAgentId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
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
  const usable = tools.filter((item) => !item.skillOnly)
  const byId = new Map(usable.map((item) => [item.id, item]))
  const ordered = TAB_ORDER.map((id) => byId.get(id)).filter((item): item is AgentToolPublic =>
    Boolean(item && composerChromeFor(item.id).showOnEngineRail)
  )
  const extras = usable.filter(
    (item) =>
      isCustomAgentId(item.id) &&
      composerChromeFor(item.id).showOnEngineRail &&
      !ordered.some((row) => row.id === item.id)
  )
  return [...ordered, ...extras]
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
