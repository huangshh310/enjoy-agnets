/**
 * E1 M2「停了就真停」渲染端收尾：状态机节点（无 settling 立即落定 / settling→stopping / 8s stuck / stuck→final /
 * 再停一次 / deadline+3s 兜底 / pending 无回音），以及真走 abortComposerRun → dispatchAgentEvent 的整链：
 * PASS_THROUGH 放行 run.stopped、只锁本会话、切会话不丢、Inbox 不出假「出错」、「再停一次」走同一 runId 的 ai.abort。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; args: unknown[] }> = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      calls.push({ path, args })
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { STOP_RENDERER_FALLBACK_MS, STOP_STUCK_AFTER_MS } = await import("@enjoy-agents/ipc-contract/stop-receipt")
const R = await import("./stop-settle-reducer.ts")
const S = await import("./stop-settle.ts")
const { useChatStore } = await import("./chat-store.ts")
const { useAttentionStore } = await import("./attention/attention-store.ts")
const { dispatchAgentEvent } = await import("./attention/dispatch-agent-event.ts")
const { abortComposerRun, restopComposerRun } = await import("../hooks/composer-run-control.ts")
const stopped = await import("./stopped-runs.ts")

let clock = 1_000_000
afterEach(() => {
  stopped.resetStoppedRunsForTest()
  S.resetStopSettleForTest(() => clock)
  useAttentionStore.setState({ items: [], parks: {}, runSessions: {} } as never)
  calls.length = 0
})
S.resetStopSettleForTest(() => clock)

const receipt = (write: "none_confirmed" | "maybe_partial" | "completed", tools: Array<[string, typeof write]> = []) => ({
  write,
  tools: tools.map(([toolCallId, w]) => ({ toolCallId, name: "write_file", write: w, evidence: [] }))
})
const run = (state: any, ...actions: any[]) => actions.reduce((acc, a) => R.reduceStopSettle(acc, a), state)
const begin = (now = 0) => ({ type: "begin", sessionId: "A", runId: "r1", toolCallIds: ["t1"], now })

test("无 settling 的 run.error：毫秒级清掉（现网立刻「已停止」，A/B/C/E 不变）", () => {
  const s = run(R.EMPTY_STOP_SETTLE, begin(0), { type: "runError", runId: "r1", now: 5 })
  assert.deepEqual(s.bySession, {})
  assert.equal(R.toolStopView(s, "t1"), null, "工具行沿用现网，不出收尾态")
})

test("带 settling：stopping；8s 起点对齐 stopRequestedAt；本地 8s 先到 → stuck", () => {
  let s = run(R.EMPTY_STOP_SETTLE, begin(1_000), { type: "runError", runId: "r1", settling: { deadlineAt: 40_000, stopRequestedAt: 900 }, now: 1_010 })
  assert.equal(s.bySession.A.phase, "stopping")
  assert.equal(s.bySession.A.t0, 900, "用 main 的 stopRequestedAt")
  assert.equal(R.toolStopView(s, "t1"), "stopping")
  s = run(s, { type: "tick", now: 900 + STOP_STUCK_AFTER_MS - 1 })
  assert.equal(s.bySession.A.phase, "stopping")
  s = run(s, { type: "tick", now: 900 + STOP_STUCK_AFTER_MS })
  assert.equal(s.bySession.A.phase, "stuck")
  assert.equal(R.toolStopView(s, "t1"), "stuck")
})

test("没有 stopRequestedAt：从点停止那一刻算 8s", () => {
  const s = run(R.EMPTY_STOP_SETTLE, begin(2_000), { type: "runError", runId: "r1", settling: { deadlineAt: 40_000 }, now: 2_050 })
  assert.equal(s.bySession.A.t0, 2_000)
  assert.equal(R.nextDueAt(s.bySession.A), 2_000 + STOP_STUCK_AFTER_MS)
})

test("main 的 run.stopped stuck 先到 → stuck（哪个先到用哪个，重复幂等）", () => {
  const s = run(
    R.EMPTY_STOP_SETTLE,
    begin(0),
    { type: "runError", runId: "r1", settling: { deadlineAt: 40_000, stopRequestedAt: 0 }, now: 1 },
    { type: "stopped", runId: "r1", sessionId: "A", phase: "stuck", receipt: receipt("maybe_partial"), now: 3_000 },
    { type: "tick", now: STOP_STUCK_AFTER_MS }
  )
  assert.equal(s.bySession.A.phase, "stuck")
  assert.equal(s.bySession.A.enteredAt, 3_000)
})

test("stuck 之后还能切到 final：按回执逐工具落定，收尾记录清掉", () => {
  const s = run(
    R.EMPTY_STOP_SETTLE,
    begin(0),
    { type: "runError", runId: "r1", settling: { deadlineAt: 40_000 }, now: 1 },
    { type: "tick", now: STOP_STUCK_AFTER_MS },
    { type: "stopped", runId: "r1", sessionId: "A", phase: "final", receipt: receipt("none_confirmed", [["t1", "none_confirmed"]]), now: 12_000 }
  )
  assert.deepEqual(s.bySession, {})
  assert.equal(R.toolStopView(s, "t1"), "none_confirmed")
  assert.equal(s.settled.r1.source, "final")
})

test("settled 直接落定（正常 ≤2s）；回执里没有的已知工具按整轮结论（maybe_partial 时 fail-closed）", () => {
  const s = run(
    R.EMPTY_STOP_SETTLE,
    { type: "begin", sessionId: "A", runId: "r1", toolCallIds: ["t1", "t2"], now: 0 },
    { type: "runError", runId: "r1", settling: { deadlineAt: 40_000 }, now: 1 },
    { type: "stopped", runId: "r1", sessionId: "A", phase: "settled", receipt: receipt("maybe_partial", [["t1", "completed"]]), now: 1_500 }
  )
  assert.equal(R.toolStopView(s, "t1"), "completed")
  assert.equal(R.toolStopView(s, "t2"), "maybe_partial")
})

test("「再停一次」：stuck → stopping，本地 8s 从这次点击重算；stopping 时不响应", () => {
  let s = run(
    R.EMPTY_STOP_SETTLE,
    begin(0),
    { type: "runError", runId: "r1", settling: { deadlineAt: 400_000 }, now: 1 }
  )
  assert.equal(run(s, { type: "restop", sessionId: "A", now: 100 }), s, "stopping 不可再点")
  s = run(s, { type: "tick", now: STOP_STUCK_AFTER_MS }, { type: "restop", sessionId: "A", now: 9_000 })
  assert.equal(s.bySession.A.phase, "stopping")
  assert.equal(s.bySession.A.t0, 9_000)
  s = run(s, { type: "tick", now: 9_000 + STOP_STUCK_AFTER_MS })
  assert.equal(s.bySession.A.phase, "stuck", "再次 8s 未落定仍回 stuck，不永远转圈")
})

test("deadlineAt + 3s 仍无终态：本地按 maybe_partial 落定（防 IPC 丢包）", () => {
  const s = run(
    R.EMPTY_STOP_SETTLE,
    begin(0),
    { type: "runError", runId: "r1", settling: { deadlineAt: 32_000 }, now: 1 },
    { type: "tick", now: STOP_STUCK_AFTER_MS },
    { type: "tick", now: 32_000 + STOP_RENDERER_FALLBACK_MS }
  )
  assert.deepEqual(s.bySession, {})
  assert.equal(R.toolStopView(s, "t1"), "maybe_partial")
  assert.equal(s.settled.r1.source, "renderer_fallback")
})

test("pending 一直等不到 run.error（abort 没到 main / main 已无此轮）：3s 后清掉，不永远转圈；run.end 也清", () => {
  const dropped = run(R.EMPTY_STOP_SETTLE, begin(0), { type: "tick", now: STOP_RENDERER_FALLBACK_MS })
  assert.deepEqual(dropped.bySession, {})
  const ended = run(R.EMPTY_STOP_SETTLE, begin(0), { type: "runEnd", runId: "r1", now: 10 })
  assert.deepEqual(ended.bySession, {})
})

function runningWithTool(sessionId: string, runId: string) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId,
    error: null,
    notice: null,
    pendingStreamEvents: [],
    pendingApproval: null,
    messages: [
      { id: "u1", role: "user", content: "please write slow note", createdAt: 1 },
      {
        id: "a1",
        role: "assistant",
        content: "",
        createdAt: 2,
        streaming: true,
        runId,
        tools: [{ id: `tc_${runId}`, name: "write_file", state: "input-available", args: { path: "e2e-stub.txt" } }]
      }
    ]
  } as never)
}

test("整链：停 A（有在途工具）→ 只锁 A；切到 B 能发；run.stopped 放行并在后台落定；Inbox 不出假「出错」", async () => {
  clock = 5_000_000
  runningWithTool("ses_A", "run_A")
  await abortComposerRun()
  assert.equal(S.isStopLocked("ses_A"), true, "点停止即进入收尾")
  assert.ok(calls.some((c) => c.path === ".ai.abort" && c.args[0] === "run_A"))
  dispatchAgentEvent({ type: "run.error", runId: "run_A", sessionId: "ses_A", message: "aborted", code: "user_aborted", preOutput: false, settling: { deadlineAt: clock + 32_000, stopRequestedAt: clock } } as never)
  assert.equal(useStopSettleView("ses_A"), "stopping")
  assert.equal(S.toolStopViewNow("tc_run_A"), "stopping")
  assert.deepEqual(
    useAttentionStore.getState().items.filter((item: any) => item.sessionId === "ses_A" && item.kind === "error"),
    [],
    "带 settling 的 run.error 不进 Inbox 出错槽"
  )
  // 切到别的会话：B 不受锁，A 的收尾还在。
  useChatStore.setState({ sessionId: "ses_B", running: false, runId: null, messages: [] } as never)
  assert.equal(S.isStopLocked("ses_B"), false, "其它会话发送不受影响")
  assert.equal(S.isStopLocked("ses_A"), true, "切走不丢")
  // 被停那一轮的回执必须放行（PASS_THROUGH），迟到的审批仍丢。
  assert.equal(stopped.isLateEventOfStoppedRun({ type: "run.stopped", runId: "run_A", sessionId: "ses_A" } as never), false)
  assert.equal(stopped.isLateEventOfStoppedRun({ type: "approval.required", runId: "run_A", sessionId: "ses_A" } as never), true)
  dispatchAgentEvent({ type: "run.stopped", runId: "run_A", sessionId: "ses_A", phase: "stuck", receipt: receipt("maybe_partial") } as never)
  assert.equal(useStopSettleView("ses_A"), "stuck")
  assert.equal(useAttentionStore.getState().items.filter((item: any) => item.sessionId === "ses_A").length, 0, "stuck 不动 Inbox")
  dispatchAgentEvent({
    type: "run.stopped",
    runId: "run_A",
    sessionId: "ses_A",
    phase: "final",
    receipt: receipt("none_confirmed", [["tc_run_A", "none_confirmed"]]),
    turn: { workflow: "in_progress", attention: "stopped" }
  } as never)
  assert.equal(S.isStopLocked("ses_A"), false, "stuck 之后落定")
  assert.equal(S.toolStopViewNow("tc_run_A"), "none_confirmed")
  assert.deepEqual(useAttentionStore.getState().items.filter((item: any) => item.kind === "error"), [], "落定也不出「出错」")
  assert.equal(useChatStore.getState().sessionId, "ses_B", "前台会话没被拽走")
})

test("「再停一次」：stuck 时同一 runId 再调 ai.abort；收尾中不调", async () => {
  clock = 6_000_000
  runningWithTool("ses_C", "run_C")
  await abortComposerRun()
  dispatchAgentEvent({ type: "run.error", runId: "run_C", sessionId: "ses_C", message: "aborted", code: "user_aborted", preOutput: false, settling: { deadlineAt: clock + 32_000 } } as never)
  calls.length = 0
  assert.equal(restopComposerRun("ses_C"), false, "stopping 时不可点")
  assert.equal(calls.filter((c) => c.path === ".ai.abort").length, 0)
  dispatchAgentEvent({ type: "run.stopped", runId: "run_C", sessionId: "ses_C", phase: "stuck", receipt: receipt("maybe_partial") } as never)
  assert.equal(restopComposerRun("ses_C"), true)
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort").map((c) => c.args[0]), ["run_C"])
  assert.equal(useStopSettleView("ses_C"), "stopping")
})

test("没有在途工具：run.error 不带 settling，立刻解锁，通知 / Inbox 照现网", async () => {
  runningWithTool("ses_D", "run_D")
  await abortComposerRun()
  dispatchAgentEvent({ type: "run.error", runId: "run_D", sessionId: "ses_D", message: "aborted", code: "user_aborted", preOutput: false, turn: { workflow: "in_progress", attention: "stopped" } } as never)
  assert.equal(S.isStopLocked("ses_D"), false)
  assert.equal(useChatStore.getState().notice, "user_aborted")
})

function useStopSettleView(sessionId: string) {
  return S.stopPhaseViewOf(S.useStopSettleStore.getState().bySession[sessionId])
}
