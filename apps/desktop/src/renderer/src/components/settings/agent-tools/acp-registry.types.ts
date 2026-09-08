/**
 * Registry 行：内置目录 + 探测状态，不上 EngineRail。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract/custom-agent"

export type RegistryStatus = "ready" | "missing" | "comingSoon"

export type RegistryRow = {
  tool: AgentToolPublic
  commandPreview: string
  status: RegistryStatus
}

export function registryRows(tools: AgentToolPublic[]): RegistryRow[] {
  return tools.filter(isRegistryTool).map((tool) => ({
    tool,
    commandPreview: [tool.binaries[0], ...tool.acpArgs].filter(Boolean).join(" "),
    status: registryStatus(tool)
  }))
}

export function isRegistryTool(tool: AgentToolPublic): boolean {
  if (tool.id === "enjoy-local" || tool.origin === "custom" || isCustomAgentId(tool.id)) return false
  return tool.transport === "acp-host"
}

function registryStatus(tool: AgentToolPublic): RegistryStatus {
  if (tool.comingSoon && !tool.available) return "comingSoon"
  if (tool.status === "ready") return "ready"
  return "missing"
}
