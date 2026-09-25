/**
 * 工具 → 当前 Enjoy run 的绑定。
 * AI SDK 7 的 execute 拿不到 runtimeContext.runId，靠 ALS 穿过活泵 / 审批续跑。
 */
import { AsyncLocalStorage } from "node:async_hooks"

const activeRunId = new AsyncLocalStorage<string>()

/** 活泵或 executeStoredTool 包一层，desktop_act 才能拿到明确 runId。 */
export function runWithActiveRunId<T>(runId: string, fn: () => T): T {
  return activeRunId.run(runId, fn)
}

/** 当前异步链上的 runId；没有绑定时为 undefined。 */
export function currentToolRunId(): string | undefined {
  return activeRunId.getStore()
}
