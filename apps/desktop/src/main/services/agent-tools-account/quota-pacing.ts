/**
 * 配额燃尽速度预测算法（Burn-Rate Pacing）。
 * 对标 OpenUsage：根据当前已用百分比、窗口总时长与重置时间，计算预期耗尽风险与进度条刻度。
 */
import type { QuotaPacingStatus, QuotaWindowItem } from "@enjoy-agents/ipc-contract"

export const DURATION_5_HOURS_MS = 5 * 60 * 60 * 1000
export const DURATION_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000
export const DURATION_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export type QuotaPacingResult = NonNullable<QuotaWindowItem["pacing"]>

export function calculateQuotaPacing(
  usedPercent: number,
  windowDurationMs: number,
  resetsAtMs?: number | null,
  nowMs: number = Date.now()
): QuotaPacingResult {
  const used = Math.min(100, Math.max(0, usedPercent))

  if (used >= 100) {
    return {
      status: "exhausted",
      projectedPercentAtReset: 100,
      cushionPercent: 0,
      projectedRunOutAt: null
    }
  }

  // 没有重置时间或已过期时，仅按绝对使用率判断
  if (!resetsAtMs || resetsAtMs <= nowMs) {
    let status: QuotaPacingStatus = "safe"
    if (used >= 90) status = "danger"
    else if (used >= 80) status = "warning"
    return {
      status,
      projectedPercentAtReset: used,
      cushionPercent: Math.max(0, 100 - used)
    }
  }

  const remainingMs = resetsAtMs - nowMs
  const effectiveWindowMs = Math.max(windowDurationMs, remainingMs)
  const elapsedMs = Math.max(0, effectiveWindowMs - remainingMs)
  const elapsedFraction = Math.min(1, Math.max(0.02, elapsedMs / effectiveWindowMs))
  const evenPacePercent = Math.min(100, Math.max(0, Math.round(elapsedFraction * 100)))

  // 刚开始或未消耗时
  if (used === 0) {
    return {
      status: "safe",
      evenPacePercent,
      projectedPercentAtReset: 0,
      cushionPercent: 100
    }
  }

  // 计算到期预计使用率
  const burnRate = used / elapsedFraction
  const projectedUsed = Math.round(burnRate)
  const cushion = Math.max(0, 100 - projectedUsed)

  const paceRatio = evenPacePercent > 0 ? used / evenPacePercent : 0

  if (projectedUsed > 100) {
    const remainingQuota = 100 - used
    const speedPerMs = used / Math.max(1, elapsedMs)
    const msToExhaust = remainingQuota / speedPerMs
    const projectedRunOutAt = Math.round(nowMs + msToExhaust)

    return {
      status: "danger",
      evenPacePercent,
      projectedPercentAtReset: projectedUsed,
      cushionPercent: 0,
      projectedRunOutAt
    }
  }

  if (paceRatio >= 1.3 || projectedUsed >= 90) {
    return {
      status: "warning",
      evenPacePercent,
      projectedPercentAtReset: projectedUsed,
      cushionPercent: Math.max(1, cushion)
    }
  }

  return {
    status: "safe",
    evenPacePercent,
    projectedPercentAtReset: projectedUsed,
    cushionPercent: cushion
  }
}
