/**
 * 错过原因三选一：睡眠窗 > 应用未运行窗 > 上次仍在跑。
 */
export type MissedScanTrigger = "startup" | "resume" | "tick"

export type TimeWindow = { start: number; end: number }

export type ClassifyMissedInput = {
  scheduledAt: number
  trigger: MissedScanTrigger
  sleepWindows: readonly TimeWindow[]
  runningWindows: readonly TimeWindow[]
  lastAliveAt?: number
  sessionStartedAt: number
  currentlyRunning?: boolean
}

export function inWindow(at: number, windows: readonly TimeWindow[]): boolean {
  return windows.some((window) => at >= window.start && at <= window.end)
}

/** 回看点落到哪一类。唤醒默认睡眠，启动默认应用未运行。 */
export function classifyMissedReason(input: ClassifyMissedInput):
  | "system_sleep"
  | "app_not_running"
  | "previous_still_running" {
  if (inWindow(input.scheduledAt, input.sleepWindows)) return "system_sleep"
  if (inWindow(input.scheduledAt, input.runningWindows)) return "previous_still_running"
  if (
    input.lastAliveAt != null &&
    input.scheduledAt > input.lastAliveAt &&
    input.scheduledAt < input.sessionStartedAt
  ) {
    return "app_not_running"
  }
  if (input.trigger === "tick" && input.currentlyRunning) return "previous_still_running"
  if (input.trigger === "resume") return "system_sleep"
  return "app_not_running"
}
