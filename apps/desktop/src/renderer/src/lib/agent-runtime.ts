/**
 * Composer / 设置共用的运行时判断。不要从 renderer import agent-harness。
 */
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract"

export { DEFAULT_RUNTIME_ID, pickSessionRuntime } from "./session-runtime.ts"
/** M3 就绪灯：Enjoy 本地恒亮，其它信 status===ready。 */
export { isEngineReady } from "./engine-ready.ts"
/** M4 切引擎：即将推出 / 未就绪自定义不可选。 */
export { canPickTool, canSwitchAgent } from "./can-switch-agent"

export function isAcpComposerRuntime(runtimeId: string | undefined): boolean {
  return isAcpHostRuntimeId(runtimeId)
}
