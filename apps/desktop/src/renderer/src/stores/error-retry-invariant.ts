/**
 * #147 后续：errorRetry（重试目标）只跟着它那条 error 活。
 * 统一在 store 写入口收口（set / setState 都过这里），不再靠各处组件 / reducer 分支手动 `errorRetry: null`：
 * error 被清掉、或换成另一条文本 → errorRetry 一律作废；error 不变则保留。
 */
import type { StateCreator } from "zustand"

type ErrorRetryState = { error: string | null; errorRetry: { error: string } | null }

export function reconcileErrorRetry<S extends ErrorRetryState>(next: S): S {
  if (!next.errorRetry) return next
  if (next.error && next.errorRetry.error === next.error) return next
  return { ...next, errorRetry: null }
}

/** zustand 中间件：每次写入（含外部 `useStore.setState`）合并后先 reconcile，再**一次**写进去。 */
export function withErrorRetryInvariant<S extends ErrorRetryState>(init: StateCreator<S>): StateCreator<S> {
  return (set, get, api) => {
    const write = set as (partial: S, replace: true) => void
    const guarded = ((partial: S | Partial<S> | ((state: S) => S | Partial<S>), replace?: boolean) => {
      const current = get()
      const patch = typeof partial === "function" ? partial(current) : partial
      if (!replace && patch === current) return
      if (
        !replace &&
        Object.entries(patch as Record<string, unknown>).every(([key, value]) =>
          Object.is((current as Record<string, unknown>)[key], value)
        )
      ) {
        return // 无变化：不写、不通知订阅者
      }
      const merged = (replace ? patch : { ...current, ...patch }) as S
      write(reconcileErrorRetry(merged), true)
    }) as typeof set
    api.setState = guarded
    return init(guarded, get, api)
  }
}
