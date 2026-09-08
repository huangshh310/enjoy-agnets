/**
 * 智能体设置分段：空态可深链到 Registry，不上 EngineRail。
 */
export const AGENT_SETTINGS_TABS = ["racks", "registry", "harness", "defaults"] as const
export type AgentSettingsTab = (typeof AGENT_SETTINGS_TABS)[number]

const AGENT_TAB_SET = new Set<string>(AGENT_SETTINGS_TABS)

/** 解析 `#/settings/agent?tab=registry`；非法值回落本机 CLI。 */
export function parseAgentSettingsTab(raw: string | null | undefined): AgentSettingsTab {
  if (raw && AGENT_TAB_SET.has(raw)) return raw as AgentSettingsTab
  return "racks"
}

/** 从 Hash History 的 location.hash 取出 tab。 */
export function agentTabFromHash(hash: string): AgentSettingsTab {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : ""
  return parseAgentSettingsTab(new URLSearchParams(query).get("tab"))
}
