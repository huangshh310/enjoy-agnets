/**
 * Composer / 设置共用的运行时判断。不要从 renderer import agent-harness。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract"
import { DEFAULT_RUNTIME_ID } from "./session-runtime"

export { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime"

export function isAcpComposerRuntime(runtimeId: string | undefined): boolean {
  return isAcpHostRuntimeId(runtimeId)
}

/** 输入框能否立刻切到该 Agent。未安装只展示提示，不要求先去设置打勾。 */
export function canSwitchAgent(tool: AgentToolPublic): boolean {
  if (tool.id === DEFAULT_RUNTIME_ID) return true
  if (tool.skillOnly || tool.comingSoon || !tool.available) return false
  return tool.status === "ready" || Boolean(tool.binaryPath)
}

export function canPickTool(tool: AgentToolPublic): boolean {
  return canSwitchAgent(tool)
}
