/**
 * 运行时延：首 token（TTFO）与 tokens/s。只算数字，不写出网。
 */

/** 首个可见 delta 相对 run.start 的毫秒数。 */
export function ttfoMs(startedAt: number, firstTokenAt?: number): number | undefined {
  if (!firstTokenAt || firstTokenAt < startedAt) return undefined
  return Math.max(0, Math.round(firstTokenAt - startedAt))
}

/** 输出 token 速率；缺 token 或耗时则不算。 */
export function tokensPerSecond(outputTokens?: number, durationMs?: number): number | undefined {
  if (!outputTokens || !durationMs || durationMs <= 0) return undefined
  return Number((outputTokens / (durationMs / 1000)).toFixed(2))
}

/** 流里第一次出现可见文本时记下时间。 */
export function markFirstVisible(now: number, already?: number): number {
  return already ?? now
}
