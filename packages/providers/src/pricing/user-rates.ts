/**
 * 档案模型上行上的用户单价。只拷有限数字，缺项保持未知。
 */
import type { UserModelRates } from "./types.ts"

const KEYS = [
  "inputPricePerMillion",
  "outputPricePerMillion",
  "cacheReadPricePerMillion",
  "cacheWritePricePerMillion",
  "reasoningPricePerMillion"
] as const

export function finitePrice(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
}

export function userRatesFrom(model: unknown): UserModelRates | undefined {
  if (!model || typeof model !== "object") return undefined
  const rec = model as Record<string, unknown>
  const next: UserModelRates = {}
  let any = false
  for (const key of KEYS) {
    const value = finitePrice(rec[key])
    if (value === undefined) continue
    next[key] = value
    any = true
  }
  return any ? next : undefined
}

export function userRatesToModelRate(user?: UserModelRates): {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  reasoning?: number
} {
  if (!user) return {}
  return {
    input: user.inputPricePerMillion,
    output: user.outputPricePerMillion,
    cacheRead: user.cacheReadPricePerMillion,
    cacheWrite: user.cacheWritePricePerMillion,
    reasoning: user.reasoningPricePerMillion
  }
}
