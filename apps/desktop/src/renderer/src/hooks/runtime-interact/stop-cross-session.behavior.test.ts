/**
 * leo #169 BLOCK（RV169B 探针转正）：clientRequestId / 停止记录按会话分开。
 * A 起步窗口里切到 B、在 B 发一句又在 B 点停止：只停 B，A 那一发照常（原来全局一个 id，B 沿用 A 的，停 B 连 A 一起 abort）。
 * A 先跑完也不放掉 B 的 id；别的会话的自启 / 建会话窗排队不算这个会话在跑。
 * soft 1：被停那一发的回执是 ok:false / 抛错，也不还稿、不出红卡、不放掉马上再发那一句的 running。
 * soft 2：R3（停掉那一发回执带 userMessageId → 照样补发空稿）/ R10（不在跑时停止不动攥着的 id）。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; arg: any }> = []
type Receipt = { ok: true; runId: string; userMessageId?: string }
const rejecters: Array<(e: Error) => void> = []
const runs: Array<{ input: any; resolve: (r: Receipt) => void }> = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      calls.push({ path, arg: args[0] })
      // agent.run 回执由测试决定什么时候到（起步窗口）。
      if (path === ".agent.run") return new Promise<Receipt>((resolve, reject) => { runs.push({ input: args[0], resolve }); rejecters.push(reject) })
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { abortComposerRun } = await import("../composer-run-control.ts")
const { dispatchAgentEvent } = await import("../../stores/attention/dispatch-agent-event.ts")
const { resetStoppedRunsForTest, isRequestStopped, lateStoppedEvent, noteRequestStopped } = await import("../stopped-runs.ts")
const { resetClientRequestIdForTest, takeClientRequestId, peekClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const queue = await import("../followup-queue.ts")
const pending = await import("../pending-failed-send.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
const att = (t: string) => ({ text: t, launched: false, cancelled: false, done: false, paused: false }) as never
async function untilRuns(n: number) {
  for (let i = 0; i < 200 && runs.length < n; i++) await new Promise((r) => setTimeout(r, 0))
  assert.equal(runs.length, n, `agent.run 已发出 ${n} 次`)
}
const aborted = (runId: string) => calls.some((c) => c.path === ".ai.abort" && c.arg === runId)
const wf = (sid: string) => (useChatStore.getState().repositories as any[]).find((n) => n.id === sid)?.workflowStatus ?? null
const userTurns = (text: string) => useChatStore.getState().messages.filter((m) => m.role === "user" && m.content === text).length

afterEach(() => {
  calls.length = 0
  runs.length = 0
  rejecters.length = 0
  resetStoppedRunsForTest()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  queue.resetFollowupsForTest()
  pending.resetPendingFailedSendForTest()
})

let seq = 0
function idle(tag: string) {
  seq += 1
  const sessionId = `ses_kai_${tag}_${seq}`
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", error: null, notice: null,
    pendingApproval: null, hasKey: true, modelId: "stub-e2e", runtimeId: "enjoy-local", pendingStreamEvents: [],
    preparingHint: false, preparingSessionId: null,
    repositories: [{ id: sessionId, workflowStatus: "done" }],
    messages: [
      { id: "u0", role: "user", content: "更早一轮", createdAt: 1 },
      { id: "a0", role: "assistant", content: "好的", createdAt: 2 }
    ]
  } as never)
  return { sessionId, s1: `run_S1_${tag}_${seq}`, s2: `run_S2_${tag}_${seq}` }
}
const runStart = (runId: string, sessionId: string, clientRequestId: string, prompt: string) =>
  ({ type: "run.start", runId, sessionId, kind: "agent", prompt, ...(clientRequestId ? { clientRequestId } : {}) }) as never

/** S1 发出 → 起步窗口里停止 → 马上发 S2；两发的 agent.run 都还没回执。 */
async function stopThenResend(tag: string) {
  const ids = idle(tag)
  const p1 = sendComposerMessage(undefined, "S1 text", att("S1 text"))
  await untilRuns(1)
  const st = useChatStore.getState()
  assert.equal(st.running, true, "S1 在起步窗口：停止按钮在")
  assert.equal(st.runId, null, "S1 还没认领 runId")
  await abortComposerRun()
  assert.equal(useChatStore.getState().running, false)
  const p2 = sendComposerMessage(undefined, "S2 text", att("S2 text"))
  await untilRuns(2)
  const c1 = runs[0].input.clientRequestId as string
  const c2 = runs[1].input.clientRequestId as string
  assert.ok(c1 && c2, "两发都带 clientRequestId")
  assert.notEqual(c2, c1, "停止放掉了 S1 的 id：S2 另开（否则 main 60s 去重把 S2 当成 S1）")
  return { ...ids, p1, p2, c1, c2 }
}


const { loadSession } = await import("../session-lifecycle.ts")
const autostart = await import("../followup-autostart.ts")
const { flushPersistedDrafts } = await import("../../lib/session-draft-storage.ts")

/** A 发出（起步窗口）→ 切到 B → B 发一句（起步窗口）。 */
async function sendInAThenB(tag: string) {
  const { sessionId: A, s1 } = idle(tag)
  const pA = sendComposerMessage(undefined, "A text", att("A text"))
  await untilRuns(1)
  const B = `ses_B_${tag}_${seq}`
  await loadSession(B, "B")
  assert.equal(useChatStore.getState().sessionId, B)
  const pB = sendComposerMessage(undefined, "B text", att("B text"))
  await untilRuns(2)
  const cA = runs[0].input.clientRequestId as string
  const cB = runs[1].input.clientRequestId as string
  assert.equal(runs[0].input.sessionId, A)
  assert.equal(runs[1].input.sessionId, B)
  assert.notEqual(cB, cA, "B 不沿用 A 在路上的 id（main 去重键是 会话 + id，渲染端也按会话分）")
  return { A, B, s1, sB: `run_B_${tag}_${seq}`, pA, pB, cA, cB }
}

test("RV169B-X：A 起步窗口里切到 B 并在 B 发一句、B 起步窗口点停止——A 那一发（没人停）不得被 abort，B 那一发被停", async () => {
  const x = await sendInAThenB("xs")
  await abortComposerRun()
  assert.equal(isRequestStopped(x.B, x.cB), true, "B 那一发记成已停")
  assert.equal(isRequestStopped(x.A, x.cA), false, "A 那一发没记")
  // A 的 run.start 与回执到达
  dispatchAgentEvent(runStart(x.s1, x.A, x.cA, "A text"))
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_A" })
  await x.pA
  dispatchAgentEvent(runStart(x.sB, x.B, x.cB, "B text"))
  runs[1].resolve({ ok: true, runId: x.sB, userMessageId: "u_B" })
  await x.pB
  await flush()
  assert.ok(!aborted(x.s1), "A 的一轮不该被 abort（用户只停了 B）")
  assert.ok(aborted(x.sB), "B 的一轮被 abort")
  assert.notEqual(useChatStore.getState().runId, x.sB, "B 那一发不被认领")
})

test("RV169B-X 变体：A 先跑完（回执先到）也不放掉 B 的 id——随后在 B 停止，B 那一发照样被认出、被 abort", async () => {
  const x = await sendInAThenB("afirst")
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_A" })
  await x.pA
  await flush()
  assert.equal(peekClientRequestIdForTest(x.B), x.cB, "A 收尾只放 A 的 id")
  await abortComposerRun()
  assert.equal(isRequestStopped(x.B, x.cB), true)
  runs[1].resolve({ ok: true, runId: x.sB, userMessageId: "u_B" })
  await x.pB
  await flush()
  assert.ok(aborted(x.sB), "B 那一发被 abort")
  assert.ok(!aborted(x.s1), "A 不受影响")
})

test("回执按发出时的会话认（send-composer-run 起步收尾）：在 B 停止后切回 A，B 的回执（run.start 没到）照样按 B 认出、abort，不认领进 A", async () => {
  const x = await sendInAThenB("switchback")
  await abortComposerRun()
  await loadSession(x.A, "A")
  assert.equal(useChatStore.getState().sessionId, x.A)
  runs[1].resolve({ ok: true, runId: x.sB, userMessageId: "u_B" })
  await x.pB
  await flush()
  assert.ok(aborted(x.sB), "B 那一发被 abort（不能按当前会话 A 去认）")
  assert.notEqual(useChatStore.getState().runId, x.sB)
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_A" })
  await x.pA
  await flush()
  assert.ok(!aborted(x.s1), "A 那一发照常")
})

test("lateStoppedEvent 看 event.sessionId：同一个 id 出现在别的会话的 run.start 上不误丢、不误 abort", async () => {
  const x = await stopThenResend("evsess")
  dispatchAgentEvent(runStart("run_other_sess", "ses_someone_else", x.c1, "别处"))
  assert.ok(!aborted("run_other_sess"), "别的会话带同一个 id 的开跑不被 abort")
  dispatchAgentEvent(runStart(x.s1, x.sessionId, x.c1, "S1 text"))
  assert.ok(aborted(x.s1), "本会话那一发照样认出")
})

test("RV169B-FA：起步窗口停止、不再发，S1 回执 ok 到——不认领、abort，不还稿不红卡，用户句一条；R3：main 已落用户句 → 照样补发空稿", async () => {
  const { sessionId, s1 } = idle("fa")
  useChatStore.setState({ composer: "" } as never)
  const p1 = sendComposerMessage(undefined, "S1 text", att("S1 text"))
  await untilRuns(1)
  await abortComposerRun()
  // 空稿补发走 300ms 防抖：慢机（Windows CI）上 flush 本身可能超过 300ms，计时器先触发——从回执前开始看，不在中途清 calls。
  const sinceReceipt = calls.length
  runs[0].resolve({ ok: true, runId: s1, userMessageId: "u_s1" })
  await p1
  await flush()
  const st = useChatStore.getState()
  assert.equal(st.running, false)
  assert.equal(st.runId, null)
  assert.equal(st.composer, "")
  assert.equal(st.error, null)
  assert.equal(userTurns("S1 text"), 1)
  assert.ok(aborted(s1))
  assert.equal(pending.pendingFailedSendFor(sessionId), null)
  flushPersistedDrafts()
  assert.ok(
    calls.slice(sinceReceipt).some((c) => c.path === ".session.drafts.save" && c.arg?.sessionId === sessionId && c.arg?.text === ""),
    "R3：停掉那一发回执带 userMessageId → 发送收尾按「已交给 main」补发空稿"
  )
})

for (const variant of ["blocked", "throws"] as const) {
  test(`soft 1（RV169B-FB）：起步窗口停止后马上发 S2，S1 回执${variant === "blocked" ? "是 ok:false（被闸拦）" : "抛错"}——不还稿、不出红卡、S2 的 running 还在、S2 照常认领`, async () => {
    const x = await stopThenResend(`fb_${variant}`)
    useChatStore.setState({ composer: "正在打的下一句" } as never)
    if (variant === "blocked") runs[0].resolve({ ok: false, code: "NEED_MODEL" } as never)
    else rejecters[0](new Error("socket hang up"))
    await x.p1
    await flush()
    let st = useChatStore.getState()
    assert.equal(st.composer, "正在打的下一句", "S1 的字没塞回输入框")
    assert.equal(st.error, null, "没有红卡")
    assert.equal(st.running, true, "S2 的停止按钮 /「正在写」还在")
    assert.equal(pending.pendingFailedSendFor(x.sessionId), null, "不记成「没发出去」")
    assert.equal(userTurns("S2 text"), 1)
    assert.equal(wf(x.sessionId), "in_progress", "S1 没开跑也不把 workflow 退回发送前（S2 正在跑）")
    dispatchAgentEvent(runStart(x.s2, x.sessionId, x.c2, "S2 text"))
    runs[1].resolve({ ok: true, runId: x.s2, userMessageId: "u_s2" })
    await x.p2
    await flush()
    st = useChatStore.getState()
    assert.equal(st.runId, x.s2, "S2 照常认领")
    assert.equal(st.running, true)
  })
}

test("RV169B-H：起步窗口停止后，无 id 的心跳 run.start 不误丢、不误 abort", async () => {
  const x = await stopThenResend("hb")
  dispatchAgentEvent(runStart("run_hb_x", x.sessionId, undefined as never, "心跳"))
  assert.ok(!aborted("run_hb_x"))
})

test("R10：不在跑时（换助手 / 停止）不碰这个会话攥着的 id，也不记成已停", async () => {
  for (const pauseReason of ["engineSwitched", "stopped"] as const) {
    const { sessionId } = idle(`r10_${pauseReason}`)
    const held = takeClientRequestId(sessionId)
    await abortComposerRun({ pauseReason })
    assert.equal(peekClientRequestIdForTest(sessionId), held, `${pauseReason}：id 原样挂着`)
    assert.equal(isRequestStopped(sessionId, held), false, `${pauseReason}：没记成已停`)
    resetClientRequestIdForTest()
  }
})

test("别的会话的自启那一发还在路上：这个会话不算在跑——换助手不把排队停成「你换了助手」，也不弃 id", async () => {
  autostart.resetFollowupAutostart()
  let release!: () => void
  const gate = new Promise<void>((r) => (release = r))
  queue.enqueueFollowup({ sessionId: "ses_auto_A", prompt: "A 排队", assets: [] })
  assert.equal(
    autostart.tryStartNextFollowup({ sessionId: "ses_auto_A", running: false, send: () => gate }),
    true
  )
  assert.equal(autostart.followupSendInFlight("ses_auto_A"), true)
  assert.equal(autostart.followupSendInFlight("ses_auto_B"), false, "按会话算")
  const { sessionId: B } = idle("auto_b")
  queue.enqueueFollowup({ sessionId: B, prompt: "B 排队", assets: [] })
  const heldB = takeClientRequestId(B)
  await abortComposerRun({ pauseReason: "engineSwitched" })
  assert.equal(queue.followupPausedReason(B), null, "B 没在跑：换助手不改 B 的排队")
  assert.equal(peekClientRequestIdForTest(B), heldB)
  release()
  await autostart.drainFollowupAutostart()
  assert.equal(autostart.followupSendInFlight("ses_auto_A"), false, "那一发返回后计数清掉")
  autostart.resetFollowupAutostart()
})

test("落地页那一发还在建会话窗里排着，用户已点进会话 B：B 不算在跑——B 里换助手不把排队停成「你换了助手」", async () => {
  const create = await import("../new-session-create.ts")
  const qcs = await import("../queue-composer-send.ts")
  create.resetNewSessionCreateForTest()
  qcs.resetQueuedComposerSendForTest()
  useChatStore.setState({ sessionId: null } as never)
  const { token } = create.beginNewSessionCreate()
  const queued = qcs.waitThenSendAfterCreate("落地页那句", async () => undefined, undefined, {
    readSessionId: () => "ses_landing_new",
    onFail: () => undefined
  })
  assert.equal(qcs.hasQueuedComposerSendFor(null), true)
  const { sessionId: B } = idle("landing_b")
  queue.enqueueFollowup({ sessionId: B, prompt: "B 排队", assets: [] })
  await abortComposerRun({ pauseReason: "engineSwitched" })
  assert.equal(queue.followupPausedReason(B), null, "落地页那一发不算 B 在跑")
  create.failNewSessionCreate(token, new Error("x"))
  await queued
  qcs.resetQueuedComposerSendForTest()
  create.resetNewSessionCreateForTest()
})

test("lateStoppedEvent 认出起步窗口停掉的那一发时自己记下 runId：同一轮随后的审批卡按「已停」认（不靠调用方再 abort 去记）", () => {
  noteRequestStopped("ses_unit", "crid_unit")
  assert.equal(lateStoppedEvent(runStart("run_unit", "ses_unit", "crid_unit", "x")), "beforeClaim")
  assert.equal(
    lateStoppedEvent({ type: "approval.required", runId: "run_unit", sessionId: "ses_unit", approvalId: "a", toolCallId: "t", name: "write_file", args: {} } as never),
    "stopped"
  )
  assert.equal(lateStoppedEvent(runStart("run_unit2", "ses_other", "crid_unit", "x")), null, "别的会话同 id 不认")
})
