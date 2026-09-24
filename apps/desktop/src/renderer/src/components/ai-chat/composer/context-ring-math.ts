/**
 * 上下文环的比例和颜色。没有窗口或没有用量时不画。
 */

export type ContextRingTone = "tertiary" | "amber" | "red"

export function contextRingRatio(used: number, window: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(window) || window <= 0 || used <= 0) return null
  return Math.min(1, used / window)
}

export function contextRingTone(ratio: number): ContextRingTone {
  if (ratio >= 0.9) return "red"
  if (ratio >= 0.75) return "amber"
  return "tertiary"
}
