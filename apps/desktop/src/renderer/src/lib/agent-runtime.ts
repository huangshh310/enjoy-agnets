/**
 * Composer / 设置共用的运行时判断。不要从 renderer import agent-harness。
 */
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract"

export { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime"

export function isAcpComposerRuntime(runtimeId: string | undefined): boolean {
  return isAcpHostRuntimeId(runtimeId)
}

export { canPickTool, canSwitchAgent } from "./can-switch-agent"
