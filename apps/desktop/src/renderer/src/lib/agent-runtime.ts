/**
 * Composer / 设置共用的运行时判断。不要从 renderer import agent-harness。
 */
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract"

export { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime.ts"
/** PATH 探测灯：空态清单仍用 status===ready。胶囊 / 发送走 engine-readiness。 */
export { isEngineReady } from "./engine-ready.ts"
/** M4 切引擎：即将推出 / 未就绪自定义不可选。 */
export { canPickTool, canSwitchAgent } from "./can-switch-agent"

export function isAcpComposerRuntime(runtimeId: string | undefined): boolean {
  return isAcpHostRuntimeId(runtimeId)
}
