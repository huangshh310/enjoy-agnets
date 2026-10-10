/**
 * models.list 是否已经回来。失败 / 超时不要永远卡发送。
 */
export const MODELS_LIST_WAIT_MS = 8_000

let modelsListed = false
let modelsListFailed = false
let modelsListStartedAt: number | null = null

export function markModelsListed(): void {
  modelsListed = true
  modelsListFailed = false
}

export function markModelsListFailed(): void {
  modelsListFailed = true
}

export function modelsHaveListed(): boolean {
  return modelsListed
}

export type ModelsListGate = "listed" | "pending" | "failed" | "timeout"

export function modelsListGate(now = Date.now()): ModelsListGate {
  if (modelsListed) return "listed"
  if (modelsListFailed) return "failed"
  if (modelsListStartedAt === null) modelsListStartedAt = now
  if (now - modelsListStartedAt >= MODELS_LIST_WAIT_MS) return "timeout"
  return "pending"
}

export function resetModelsListed(): void {
  modelsListed = false
  modelsListFailed = false
  modelsListStartedAt = null
}
