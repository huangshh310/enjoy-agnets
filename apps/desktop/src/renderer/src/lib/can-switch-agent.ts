/**
 * Composer 能否打开该 Agent 面板（已装或有自定义路径）。
 * 不等于能 bind / 发送；登录态走 engine-readiness.canBindEngine。
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
