/**
 * 当前启用档案回落：显式激活优先，否则第一份仍启用的。
 * getActiveProfile 与 chat-readiness 组装共用，不要各写一套。
 */
export function pickActiveEnabled<T>(
  rows: readonly T[],
  opts: {
    enabled?: (row: T) => boolean
    active: (row: T) => boolean | undefined
  }
): T | undefined {
  const enabled = rows.filter(opts.enabled ?? (() => true))
  const marked = enabled.find((row) => opts.active(row) === true)
  if (marked) return marked
  if (enabled.some((row) => opts.active(row) === false)) {
    return enabled.find((row) => opts.active(row) !== false)
  }
  return enabled[0]
}
