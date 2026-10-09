/**
 * 纯历史栈：打开、后退、前进、跳段、删除。
 * 每个窗口一份，不碰 Chromium 的 webContents 历史。
 */
import { HISTORY_COALESCE_MS, HISTORY_LIMIT } from "./constants.ts"
import type { HistoryEntry, HistorySide, HistoryStack } from "./nav-history.types.ts"

export function openHistory(stack: HistoryStack, next: HistoryEntry, now: number): HistoryStack {
  if (!stack.seeded) return { ...stack, current: next, seeded: true }
  if (next.id === stack.current.id) return { ...stack, current: next }
  if (canCoalesce(stack, now)) {
    return { ...stack, current: next, future: [], lastPushAt: now, lastAction: "push" }
  }
  return {
    ...stack,
    past: trimEnd([...stack.past, stack.current]),
    current: next,
    future: [],
    lastPushAt: now,
    lastAction: "push",
    seeded: true
  }
}

/** 连续快速打开只保留最终落点，中间页不进 past。后退/前进之后的下一次打开仍是新 push。 */
function canCoalesce(stack: HistoryStack, now: number): boolean {
  if (stack.lastAction !== "push" || stack.lastPushAt == null) return false
  return now - stack.lastPushAt < HISTORY_COALESCE_MS
}

export function backHistory(stack: HistoryStack): HistoryStack | null {
  return jumpHistory(stack, "past", 1)
}

export function forwardHistory(stack: HistoryStack): HistoryStack | null {
  return jumpHistory(stack, "future", 1)
}

/**
 * steps 从当前这一侧的最近一条数起。
 * 被跳过的页整段搬到另一侧，最近离开的仍在那一侧末尾。
 */
export function jumpHistory(stack: HistoryStack, side: HistorySide, steps: number): HistoryStack | null {
  if (steps < 1) return null
  const source = side === "past" ? stack.past : stack.future
  if (source.length < steps) return null
  const moving = source.slice(-steps)
  const target = moving[0]
  if (!target) return null
  const skipped = moving.slice(1).reverse()
  const rest = source.slice(0, -steps)
  const carried = trimEnd(side === "past"
    ? [...stack.future, stack.current, ...skipped]
    : [...stack.past, stack.current, ...skipped])
  return {
    ...stack,
    past: side === "past" ? rest : carried,
    future: side === "future" ? rest : carried,
    current: target,
    seeded: true,
    lastAction: "travel",
    lastPushAt: null
  }
}

/** 剪掉已删项目的条目，当前被剪时换成 fallback，不回落到 past（避免跳去设置页）。 */
export function pruneHistory(
  stack: HistoryStack,
  ids: ReadonlySet<string>,
  fallback: HistoryEntry
): { stack: HistoryStack; removedCurrent: boolean } {
  const past = stack.past.filter((entry) => !ids.has(entry.id))
  const future = stack.future.filter((entry) => !ids.has(entry.id))
  if (!ids.has(stack.current.id)) {
    return { removedCurrent: false, stack: { ...stack, past, future } }
  }
  return {
    removedCurrent: true,
    stack: { ...stack, past, future, current: fallback }
  }
}

export function forgetHistory(
  stack: HistoryStack,
  ids: ReadonlySet<string>,
  fallback: HistoryEntry
): { stack: HistoryStack; removedCurrent: boolean } {
  const past = stack.past.filter((entry) => !ids.has(entry.id))
  const future = stack.future.filter((entry) => !ids.has(entry.id))
  if (!ids.has(stack.current.id)) {
    return { removedCurrent: false, stack: { ...stack, past, future } }
  }
  const previous = past.at(-1)
  if (!previous) {
    return {
      removedCurrent: true,
      stack: travelTo({ ...stack, past: [], future, current: fallback })
    }
  }
  return {
    removedCurrent: true,
    stack: travelTo({ ...stack, past: past.slice(0, -1), future, current: previous })
  }
}

export function retargetHistory(stack: HistoryStack, fromId: string, next: HistoryEntry): HistoryStack {
  if (stack.current.id !== fromId) return stack
  return { ...stack, current: next, seeded: true }
}

export function recentHistory(entries: readonly HistoryEntry[], limit: number): HistoryEntry[] {
  return entries.slice(Math.max(0, entries.length - limit)).reverse()
}

function travelTo(stack: HistoryStack): HistoryStack {
  return { ...stack, seeded: true, lastAction: "travel", lastPushAt: null }
}

/** 超过上限时丢掉最老的，保留末尾。 */
function trimEnd(entries: HistoryEntry[]): HistoryEntry[] {
  if (entries.length <= HISTORY_LIMIT) return entries
  return entries.slice(entries.length - HISTORY_LIMIT)
}
