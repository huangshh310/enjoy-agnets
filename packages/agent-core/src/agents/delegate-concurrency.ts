/**
 * 子智能体并发闸门。挂在 createDelegateTool 闭包，禁止模块单例跨 run 漏槽。
 * 不是 Workflow DAG，也不是侧栏会话。
 */

export const MAX_PARALLEL_DELEGATES = 4

export type DelegateGate = <T>(run: () => Promise<T>, abortSignal?: AbortSignal) => Promise<T>

type Waiter = {
  resolve: () => void
  reject: (error: Error) => void
  signal?: AbortSignal
  onAbort?: () => void
}

/** 每个 createDelegateTool / createCodingAgent 一份；abort / 抛错必须释放槽。 */
export function createDelegateGate(limit = MAX_PARALLEL_DELEGATES): DelegateGate {
  let active = 0
  const waiters: Waiter[] = []

  function acquire(abortSignal?: AbortSignal): Promise<void> {
    if (abortSignal?.aborted) return Promise.reject(toAbortError(abortSignal))
    if (active < limit) {
      active += 1
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal: abortSignal }
      const onAbort = () => {
        const index = waiters.indexOf(waiter)
        if (index < 0) return
        waiters.splice(index, 1)
        reject(toAbortError(abortSignal))
      }
      waiter.onAbort = onAbort
      waiters.push(waiter)
      abortSignal?.addEventListener("abort", onAbort, { once: true })
    })
  }

  function release(): void {
    const next = waiters.shift()
    if (next) {
      if (next.signal && next.onAbort) {
        next.signal.removeEventListener("abort", next.onAbort)
      }
      next.resolve()
      return
    }
    active = Math.max(0, active - 1)
  }

  return async function gate<T>(run: () => Promise<T>, abortSignal?: AbortSignal): Promise<T> {
    await acquire(abortSignal)
    try {
      if (abortSignal?.aborted) throw toAbortError(abortSignal)
      return await run()
    } finally {
      release()
    }
  }
}

function toAbortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason
  const error = new Error("The operation was aborted")
  error.name = "AbortError"
  return error
}
