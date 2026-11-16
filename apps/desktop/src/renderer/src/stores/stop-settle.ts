/**
 * E1 M2：停止收尾状态（按 sessionId）。纯状态机在 stop-settle-reducer.ts；这里只挂 zustand 与定时器。
 * 定时器挂在模块上，不挂组件：切走会话、组件卸载都不会丢 8s / 兜底节点。
 * 只锁本会话的发送位与停止钮；新建会话、切换会话、设置、其它会话的发送都不读它（产品 §2.5 / §2.6）。
 */
import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import {
  EMPTY_STOP_SETTLE,
  nextDueAt,
  reduceStopSettle,
  toolStopView,
  type StopEntry,
  type StopSettleAction,
  type StopSettleState,
  type ToolStopView
} from "./stop-settle-reducer"
import { followupPausedReason, pauseFollowups } from "../hooks/followup-queue"

type StopSettleStore = StopSettleState & { dispatch: (action: StopSettleAction) => void }

export const useStopSettleStore = create<StopSettleStore>((set, get) => ({
  ...EMPTY_STOP_SETTLE,
  dispatch: (action) => {
    const { bySession, settled } = get()
    const next = reduceStopSettle({ bySession, settled }, action)
    if (next.bySession !== bySession || next.settled !== settled) set(next)
    for (const sessionId of Object.keys(bySession)) {
      if (!next.bySession[sessionId]) holdQueueAfterSettle(sessionId)
    }
    scheduleTick()
  }
}))

/**
 * jojo F2：收尾期间排队项发不出去（锁挡住自启），但期间可能被解除了暂停（点了暂停行的「继续」）或新排了几条。
 * 落定那一刻没有任何东西会再踢自启——排队行会一直显示「排队中 / 下一句」却不发。
 * 落定时这个会话的队列还有东西、又没停着：按「你停止了上一轮」停住（与刷新后的暂停态同一份文案 / 行为），等用户点「继续」。
 */
function holdQueueAfterSettle(sessionId: string): void {
  if (followupPausedReason(sessionId)) return
  pauseFollowups(sessionId, "stopped")
}

let timer: ReturnType<typeof setTimeout> | null = null
let now: () => number = () => Date.now()

function scheduleTick(): void {
  if (timer) clearTimeout(timer)
  timer = null
  const due = Object.values(useStopSettleStore.getState().bySession)
    .map(nextDueAt)
    .filter((at): at is number => at !== null)
  if (due.length === 0) return
  const wait = Math.max(0, Math.min(...due) - now() + 5)
  timer = setTimeout(() => {
    timer = null
    useStopSettleStore.getState().dispatch({ type: "tick", now: now() })
  }, wait)
  // node 单测里别让收尾定时器拖住进程；浏览器里返回数字，没有 unref。
  ;(timer as { unref?: () => void }).unref?.()
}

/** 用户点停止 / Esc：这一轮进入收尾（runId 还没认领时不进，沿用现网立刻落定）。 */
export function beginStopSettle(
  sessionId: string | null | undefined,
  runId: string | null | undefined,
  toolCallIds: string[] = []
): void {
  if (!sessionId || !runId) return
  useStopSettleStore.getState().dispatch({ type: "begin", sessionId, runId, toolCallIds, now: now() })
}

/** dispatchAgentEvent 里调用：只认 run.error / run.end / run.stopped。 */
export function noteStopSettleEvent(event: StreamEvent): void {
  const dispatch = useStopSettleStore.getState().dispatch
  if (event.type === "run.error") {
    dispatch({ type: "runError", runId: event.runId, settling: event.settling, now: now() })
  } else if (event.type === "run.end") {
    dispatch({ type: "runEnd", runId: event.runId, now: now() })
  } else if (event.type === "run.stopped") {
    dispatch({
      type: "stopped",
      runId: event.runId,
      sessionId: event.sessionId,
      phase: event.phase,
      receipt: event.receipt,
      now: now()
    })
  }
}

/** 「再停一次」：同一 runId 回到收尾（调用方负责 ai.abort(runId)）。 */
export function restopSettle(sessionId: string): StopEntry | null {
  const entry = useStopSettleStore.getState().bySession[sessionId]
  if (!entry || entry.phase !== "stuck") return null
  useStopSettleStore.getState().dispatch({ type: "restop", sessionId, now: now() })
  return entry
}

export type StopPhaseView = "stopping" | "stuck" | null

/** 本会话的收尾显示：pending 也按「正在停下…」。 */
export function stopPhaseViewOf(entry: StopEntry | undefined): StopPhaseView {
  if (!entry) return null
  return entry.phase === "stuck" ? "stuck" : "stopping"
}

export function useStopPhase(sessionId: string | null | undefined): StopPhaseView {
  return useStopSettleStore((state) => stopPhaseViewOf(sessionId ? state.bySession[sessionId] : undefined))
}

export function isStopLocked(sessionId: string | null | undefined): boolean {
  return Boolean(sessionId && useStopSettleStore.getState().bySession[sessionId])
}

/** 本会话收尾没落定（正在停下 / 没能停下）：发送锁与重新生成 / 编辑重发 / 重试 / Todo 继续共用这一个判断。 */
export function useStopLocked(sessionId: string | null | undefined): boolean {
  return useStopSettleStore((state) => Boolean(sessionId && state.bySession[sessionId]))
}

export function useToolStopView(toolCallId: string): ToolStopView | null {
  return useStopSettleStore((state) => toolStopView(state, toolCallId))
}

export function toolStopViewNow(toolCallId: string): ToolStopView | null {
  return toolStopView(useStopSettleStore.getState(), toolCallId)
}

export function resetStopSettleForTest(clock?: () => number): void {
  if (timer) clearTimeout(timer)
  timer = null
  now = clock ?? (() => Date.now())
  useStopSettleStore.setState({ ...EMPTY_STOP_SETTLE })
}
