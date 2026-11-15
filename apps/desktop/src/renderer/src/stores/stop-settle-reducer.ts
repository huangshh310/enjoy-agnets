/**
 * E1 M2「停了就真停」渲染端收尾状态机（纯函数，单测直接测）。按 sessionId 记，不放全局 running。
 *
 * pending ── run.error 无 settling / run.end ─▶ 清掉（现网路径：立刻「已停止」）
 *    │      run.error 带 settling              ─▶ stopping（8s 起点对齐 settling.stopRequestedAt，缺省用点停止时刻）
 *    │      本地 STOP_RENDERER_FALLBACK_MS 仍无 run.error ─▶ 清掉（abort 没到 main / main 已无此轮）
 * stopping ── run.stopped stuck，或本地 t0+8s 先到 ─▶ stuck（「没能停下 / 再停一次」）
 * stopping|stuck ── run.stopped settled|final ─▶ 落定（按回执 write 记下每个工具的结论）
 *                ── 本地 deadlineAt+3s 仍无终态   ─▶ 落定 maybe_partial（防 IPC 丢包，fail-closed）
 * stuck ──「再停一次」─▶ stopping（t0 重置为这次点击：本地 8s 重新算；main 继续探活，final 照收）
 *
 * pending 也按「正在停下…」显示：没有在途工具时 run.error 毫秒级就到，界面与现网一致。
 */
import {
  STOP_RENDERER_FALLBACK_MS,
  STOP_STUCK_AFTER_MS,
  type StopReceipt,
  type StopWriteVerdict
} from "@enjoy-agents/ipc-contract/stop-receipt"

export type StopPhase = "pending" | "stopping" | "stuck"

export type StopEntry = {
  runId: string
  sessionId: string
  phase: StopPhase
  /** 点停止（或再停一次）的本地时刻。 */
  clickedAt: number
  /** 8s 起点：有 settling.stopRequestedAt 用它，否则用 clickedAt。 */
  t0: number
  deadlineAt?: number
  /** 每个阶段进入的时刻（自检时序用）。 */
  enteredAt: number
  /** 点停止时这一轮助手消息里的工具（工具行据此显示收尾态）。 */
  toolCallIds: string[]
}

export type SettledStop = {
  runId: string
  sessionId: string
  write: StopWriteVerdict
  tools: Record<string, StopWriteVerdict>
  toolCallIds: string[]
  /** 回执来源：main 的 settled / final，或本地兜底。 */
  source: "settled" | "final" | "renderer_fallback"
  at: number
}

export type StopSettleState = {
  bySession: Record<string, StopEntry>
  settled: Record<string, SettledStop>
}

export type StopSettleAction =
  | { type: "begin"; sessionId: string; runId: string; toolCallIds?: string[]; now: number }
  | { type: "runError"; runId: string; settling?: { deadlineAt: number; stopRequestedAt?: number }; now: number }
  | { type: "runEnd"; runId: string; now: number }
  | { type: "stopped"; runId: string; sessionId: string; phase: "stuck" | "settled" | "final"; receipt: StopReceipt; now: number }
  | { type: "restop"; sessionId: string; now: number }
  | { type: "tick"; now: number }

export const EMPTY_STOP_SETTLE: StopSettleState = { bySession: {}, settled: {} }

const MAX_SETTLED = 64

export function reduceStopSettle(state: StopSettleState, action: StopSettleAction): StopSettleState {
  switch (action.type) {
    case "begin": {
      const prev = state.bySession[action.sessionId]
      if (prev && prev.runId === action.runId) return state
      return withEntry(state, {
        runId: action.runId,
        sessionId: action.sessionId,
        phase: "pending",
        clickedAt: action.now,
        t0: action.now,
        enteredAt: action.now,
        toolCallIds: action.toolCallIds ?? []
      })
    }
    case "runError": {
      const entry = findByRun(state, action.runId)
      if (!entry || entry.phase !== "pending") return state
      if (!action.settling) return withoutEntry(state, entry.sessionId)
      return withEntry(state, {
        ...entry,
        phase: "stopping",
        t0: action.settling.stopRequestedAt ?? entry.clickedAt,
        deadlineAt: action.settling.deadlineAt,
        enteredAt: action.now
      })
    }
    case "runEnd": {
      const entry = findByRun(state, action.runId)
      if (!entry || entry.phase !== "pending") return state
      return withoutEntry(state, entry.sessionId)
    }
    case "stopped": {
      const entry = findByRun(state, action.runId)
      if (action.phase === "stuck") {
        if (!entry || entry.phase === "stuck") return state
        return withEntry(state, { ...entry, phase: "stuck", enteredAt: action.now })
      }
      if (state.settled[action.runId]) return state
      const tools: Record<string, StopWriteVerdict> = {}
      for (const tool of action.receipt.tools) tools[tool.toolCallId] = tool.write
      const next = withSettled(state, {
        runId: action.runId,
        sessionId: action.sessionId,
        write: action.receipt.write,
        tools,
        toolCallIds: [...new Set([...(entry?.toolCallIds ?? []), ...Object.keys(tools)])],
        source: action.phase,
        at: action.now
      })
      return entry ? withoutEntry(next, entry.sessionId) : next
    }
    case "restop": {
      const entry = state.bySession[action.sessionId]
      if (!entry || entry.phase !== "stuck") return state
      return withEntry(state, { ...entry, phase: "stopping", clickedAt: action.now, t0: action.now, enteredAt: action.now })
    }
    case "tick": {
      let next = state
      for (const entry of Object.values(state.bySession)) {
        const due = dueTransition(entry, action.now)
        if (due === "drop") next = withoutEntry(next, entry.sessionId)
        else if (due === "stuck") next = withEntry(next, { ...entry, phase: "stuck", enteredAt: action.now })
        else if (due === "fallback") {
          next = withoutEntry(
            withSettled(next, {
              runId: entry.runId,
              sessionId: entry.sessionId,
              write: "maybe_partial",
              tools: {},
              toolCallIds: entry.toolCallIds,
              source: "renderer_fallback",
              at: action.now
            }),
            entry.sessionId
          )
        }
      }
      return next
    }
  }
}

/** 这条记录下一次该在什么时刻被 tick（没有就 null）。 */
export function nextDueAt(entry: StopEntry): number | null {
  if (entry.phase === "pending") return entry.clickedAt + STOP_RENDERER_FALLBACK_MS
  const fallbackAt = entry.deadlineAt !== undefined ? entry.deadlineAt + STOP_RENDERER_FALLBACK_MS : null
  if (entry.phase === "stopping") {
    const stuckAt = entry.t0 + STOP_STUCK_AFTER_MS
    return fallbackAt === null ? stuckAt : Math.min(stuckAt, fallbackAt)
  }
  return fallbackAt
}

function dueTransition(entry: StopEntry, now: number): "drop" | "stuck" | "fallback" | null {
  if (entry.phase === "pending") return now >= entry.clickedAt + STOP_RENDERER_FALLBACK_MS ? "drop" : null
  if (entry.deadlineAt !== undefined && now >= entry.deadlineAt + STOP_RENDERER_FALLBACK_MS) return "fallback"
  if (entry.phase === "stopping" && now >= entry.t0 + STOP_STUCK_AFTER_MS) return "stuck"
  return null
}

/** 某个工具在停止收尾里的显示结论：收尾中 / 卡住 / 三种落定；与这次停止无关返回 null。 */
export type ToolStopView = "stopping" | "stuck" | StopWriteVerdict

export function toolStopView(state: StopSettleState, toolCallId: string): ToolStopView | null {
  for (const entry of Object.values(state.bySession)) {
    if (entry.toolCallIds.includes(toolCallId)) return entry.phase === "stuck" ? "stuck" : "stopping"
  }
  for (const settled of Object.values(state.settled)) {
    const verdict = settled.tools[toolCallId]
    if (verdict) return verdict
    // 回执里没有这个工具（或本地兜底落定）：拿不准一律 maybe_partial（arch §5.2#5，fail-closed）。
    if (settled.toolCallIds.includes(toolCallId)) return settled.source === "renderer_fallback" ? "maybe_partial" : settled.write
  }
  return null
}

function findByRun(state: StopSettleState, runId: string): StopEntry | undefined {
  for (const entry of Object.values(state.bySession)) if (entry.runId === runId) return entry
  return undefined
}

function withEntry(state: StopSettleState, entry: StopEntry): StopSettleState {
  return { ...state, bySession: { ...state.bySession, [entry.sessionId]: entry } }
}

function withoutEntry(state: StopSettleState, sessionId: string): StopSettleState {
  if (!state.bySession[sessionId]) return state
  const bySession = { ...state.bySession }
  delete bySession[sessionId]
  return { ...state, bySession }
}

function withSettled(state: StopSettleState, settled: SettledStop): StopSettleState {
  const entries = Object.entries({ ...state.settled, [settled.runId]: settled })
  const trimmed = entries.length > MAX_SETTLED ? entries.slice(entries.length - MAX_SETTLED) : entries
  return { ...state, settled: Object.fromEntries(trimmed) }
}
