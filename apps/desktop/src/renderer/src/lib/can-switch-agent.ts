/**
 * Composer 能否立刻切到该 Agent。即将推出与未就绪自定义不可选。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

const DEFAULT_RUNTIME_ID = "enjoy-local"

export function canSwitchAgent(tool: AgentToolPublic): boolean {
  if (tool.id === DEFAULT_RUNTIME_ID) return true
  if (tool.skillOnly || tool.comingSoon || !tool.available) return false
  if (tool.origin === "custom") return tool.status === "ready" && tool.enabled !== false
  return tool.status === "ready" || Boolean(tool.binaryPath)
}

export function canPickTool(tool: AgentToolPublic): boolean {
  return canSwitchAgent(tool)
}
