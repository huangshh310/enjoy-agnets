/**
 * total / step / chunk / tool 超时。到点抛 RuntimeError(timeout)，可被 UI 区分并重试。
 */
import { RuntimeError } from "../runtime/errors.ts"

export type TimeoutBudget = {
  totalMs?: number
  stepMs?: number
  chunkMs?: number
  toolMs?: number
}

/** 正数才启用；0 / 缺省表示不限。 */
export function resolveTimeoutMs(overrideMs?: number, fallbackMs?: number): number | undefined {
  const ms = overrideMs ?? fallbackMs
  if (!ms || !Number.isFinite(ms) || ms <= 0) return undefined
  return Math.floor(ms)
}

export function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number | undefined,
  parent?: AbortSignal
): Promise<T> {
  if (!ms || ms <= 0) return work(parent ?? new AbortController().signal)
  const controller = new AbortController()
  const onParentAbort = () => controller.abort()
  parent?.addEventListener("abort", onParentAbort, { once: true })
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      parent?.removeEventListener("abort", onParentAbort)
      fn()
    }
    const timer = setTimeout(() => {
      controller.abort()
      finish(() => reject(new RuntimeError("timeout", "total timeout", true)))
    }, ms)
    work(controller.signal).then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error))
    )
  })
}

export function throwIfTimedOut(signal: AbortSignal, label = "total"): void {
  if (signal.aborted) {
    throw new RuntimeError("timeout", `${label} timeout`, true)
  }
}

/** 到点 abort；调用方用返回值清 timer。 */
export function armTimeout(
  abort: AbortController,
  ms: number | undefined,
  onTimeout: () => void
): () => void {
  if (!ms || ms <= 0) return () => undefined
  const timer = setTimeout(() => {
    onTimeout()
    abort.abort()
  }, ms)
  return () => clearTimeout(timer)
}
