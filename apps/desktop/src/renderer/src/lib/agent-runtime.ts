/**
 * Composer / 设置共用的运行时判断。不要从 renderer import agent-harness。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract"
import { canSwitchAgent } from "./engine-ready.ts"

export { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime.ts"
export { canSwitchAgent, isEngineReady } from "./engine-ready.ts"

export function isAcpComposerRuntime(runtimeId: string | undefined): boolean {
  return isAcpHostRuntimeId(runtimeId)
}

export function canPickTool(tool: AgentToolPublic): boolean {
  return canSwitchAgent(tool)
}
