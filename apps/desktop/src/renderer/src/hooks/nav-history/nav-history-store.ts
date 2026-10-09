/**
 * 当前窗口的历史栈。不持久化，新窗口只有 seed 进来的当前页。
 */
import { create } from "zustand"
import { DEFAULT_HISTORY_ID } from "./constants"
import { slideForTravel } from "./history-motion"
import { backHistory, forgetHistory, forwardHistory, jumpHistory, openHistory, retargetHistory } from "./nav-history"
import type { HistorySlide } from "./history-slide"
import type { HistoryEntry, HistorySide, HistoryStack } from "./nav-history.types"

type NavHistoryState = HistoryStack & {
  slide: HistorySlide | null
  slideToken: number
  record: (entry: HistoryEntry, now?: number) => void
  back: () => boolean
  forward: () => boolean
  jump: (side: HistorySide, recentIndex: number) => boolean
  forget: (ids: readonly string[], fallback: HistoryEntry) => boolean
  retarget: (fromId: string, entry: HistoryEntry) => void
}

const placeholder: HistoryEntry = {
  id: DEFAULT_HISTORY_ID,
  title: "新对话",
  params: { kind: "route", to: "/" }
}

function readStack(state: NavHistoryState): HistoryStack {
  return {
    past: state.past,
    current: state.current,
    future: state.future,
    seeded: state.seeded,
    lastPushAt: state.lastPushAt,
    lastAction: state.lastAction
  }
}

function writeStack(state: NavHistoryState, stack: HistoryStack): Partial<NavHistoryState> {
  return { ...stack, slide: state.slide, slideToken: state.slideToken }
}

/** 每次后退/前进都换 token。slide 为空表示这次不播位移。 */
function writeTravel(
  state: NavHistoryState,
  stack: HistoryStack,
  direction: HistorySlide
): Partial<NavHistoryState> {
  return {
    ...stack,
    slide: slideForTravel(direction, stack.current),
    slideToken: state.slideToken + 1
  }
}

export const useNavHistoryStore = create<NavHistoryState>((set, get) => ({
  past: [],
  current: placeholder,
  future: [],
  seeded: false,
  lastPushAt: null,
  lastAction: null,
  slide: null,
  slideToken: 0,
  record: (entry, now = Date.now()) => {
    set((state) => writeStack(state, openHistory(readStack(state), entry, now)))
  },
  back: () => travel("past", "back", set, get),
  forward: () => travel("future", "forward", set, get),
  jump: (side, recentIndex) => {
    const next = jumpHistory(readStack(get()), side, recentIndex + 1)
    if (!next) return false
    set((state) => writeTravel(state, next, side === "past" ? "back" : "forward"))
    return true
  },
  forget: (ids, fallback) => {
    const result = forgetHistory(readStack(get()), new Set(ids), fallback)
    set((state) => writeStack(state, result.stack))
    return result.removedCurrent
  },
  retarget: (fromId, entry) => {
    set((state) => writeStack(state, retargetHistory(readStack(state), fromId, entry)))
  }
}))

function travel(
  side: HistorySide,
  direction: HistorySlide,
  set: (fn: (state: NavHistoryState) => Partial<NavHistoryState>) => void,
  get: () => NavHistoryState
): boolean {
  const next = side === "past" ? backHistory(readStack(get())) : forwardHistory(readStack(get()))
  if (!next) return false
  set((state) => writeTravel(state, next, direction))
  return true
}
