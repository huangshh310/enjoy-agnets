/**
 * host #169（leo KAI 探针转正）：起步窗口（runId 还没认领）里点停止，马上又发一句。
 * 真走 sendComposerMessage → launchComposerRun / abortComposerRun / dispatchAgentEvent / decidePendingApproval：
 * 被停的那一发 S1 不得被认领（不跑完、它的审批卡不挂、点批准也不发 decide），新一句 S2 照常认领；
 * 回执先到、run.start 先到两种次序都一样。soft 2：S1 不走失败还稿，用户句不重复。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; arg: any }> = []
type Receipt = { ok: true; runId: string; userMessageId?: string }
const runs: Array<{ input: any; resolve: (r: Receipt) => void }> = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      calls.push({ path, arg: args[0] })
      // agent.run 回执由测试决定什么时候到（起步窗口）。
      if (path === ".agent.run") return new Promise<Receipt>((resolve) => runs.push({ input: args[0], resolve }))
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
const { decidePendingApproval } = await import("../decide-pending-approval.ts")
const { resetStoppedRunsForTest } = await import("../stopped-runs.ts")
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
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
const decided = (runId: string) => calls.some((c) => c.path === ".agent.decide" && c.arg?.runId === runId)
const userTurns = (text: string) => useChatStore.getState().messages.filter((m) => m.role === "user" && m.content === text).length

afterEach(() => {
  calls.length = 0
  runs.length = 0
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
    messages: [
      { id: "u0", role: "user", content: "更早一轮", createdAt: 1 },
      { id: "a0", role: "assistant", content: "好的", createdAt: 2 }
    ]
  } as never)
  return { sessionId, s1: `run_S1_${tag}_${seq}`, s2: `run_S2_${tag}_${seq}` }
}
const runStart = (runId: string, sessionId: string, clientRequestId: string, prompt: string) =>
  ({ type: "run.start", runId, sessionId, kind: "agent", prompt, clientRequestId }) as never
const card = (runId: string, sessionId: string) =>
  ({ type: "approval.required", runId, sessionId, approvalId: `apr_${runId}`, toolCallId: `tool_${runId}`, name: "write_file", args: { path: "a.ts", content: "x" } }) as never

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

function assertS1Gone(s1: string, label: string) {
  const st = useChatStore.getState()
  assert.notEqual(st.runId, s1, `${label}：S1 没被认领`)
  assert.notEqual(st.pendingApproval?.runId, s1, `${label}：S1 的审批卡不挂`)
  assert.ok(aborted(s1), `${label}：S1 在 main 里被 abort`)
}

async function finishS2AndCheck(x: Awaited<ReturnType<typeof stopThenResend>>) {
  const { sessionId, s1, s2, p2, c2 } = x
  dispatchAgentEvent(runStart(s2, sessionId, c2, "S2 text"))
  runs[1].resolve({ ok: true, runId: s2, userMessageId: "u_s2" })
  await p2
  await flush()
  let st = useChatStore.getState()
  assert.equal(st.runId, s2, "S2 照常认领")
  assert.equal(st.running, true, "S2 在跑")
  assert.ok(!aborted(s2), "S2 不被 abort")
  // S1 迟到的字 / 审批卡：都不进前台。
  dispatchAgentEvent({ type: "text.delta", runId: s1, sessionId, text: "OLD-S1-OUTPUT" } as never)
  dispatchAgentEvent(card(s1, sessionId))
  st = useChatStore.getState()
  assert.ok(!st.messages.some((m) => m.content.includes("OLD-S1-OUTPUT")), "S1 的字不进前台")
  assert.equal(st.pendingApproval, null, "S1 的卡不挂")
  // 卡还挂在别处（Dock / 旧渲染）时照点批准：不发 decide。
  useChatStore.setState({ pendingApproval: { ...(card(s1, sessionId) as object) }, runId: s2 } as never)
  await decidePendingApproval("allow")
  assert.ok(!decided(s1), "S1 的审批点了也不发 decide（工具不会执行）")
  assert.equal(useChatStore.getState().error, null, "不出红卡")
  // S2 的卡照常挂、照常能批。
  dispatchAgentEvent(card(s2, sessionId))
  assert.equal(useChatStore.getState().pendingApproval?.runId, s2, "S2 的卡照常挂上")
  await decidePendingApproval("allow")
  assert.ok(decided(s2), "S2 的批准照常发出")
}

test("KAI：停止后马上再发，S1 的 run.start 先到、回执后到——S1 不被认领、被 abort，卡不挂、批不了；S2 照常", async () => {
  const x = await stopThenResend("start_first")
  dispatchAgentEvent(runStart(x.s1, x.sessionId, x.c1, "S1 text"))
  assert.ok(aborted(x.s1), "S1 的 run.start 按 clientRequestId 认出，当场 abort")
  assert.equal(useChatStore.getState().running, true, "S2 的停止按钮还在")
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_s1" })
  await x.p1
  await flush()
  assertS1Gone(x.s1, "S1 回执后")
  await finishS2AndCheck(x)
})

test("KAI：停止后马上再发，S1 的回执先到、run.start 后到——同样不认领、被 abort", async () => {
  const x = await stopThenResend("receipt_first")
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_s1" })
  await x.p1
  await flush()
  assertS1Gone(x.s1, "S1 回执后")
  assert.equal(useChatStore.getState().running, true, "S2 的停止按钮还在")
  dispatchAgentEvent(runStart(x.s1, x.sessionId, x.c1, "S1 text"))
  assertS1Gone(x.s1, "S1 迟到的 run.start 后")
  await finishS2AndCheck(x)
})

test("soft 2：被停的 S1 回执到了不走失败还稿——输入框不塞回 S1、不记「没发出去」、不出红卡，S1 用户句只有一条", async () => {
  const x = await stopThenResend("no_dup")
  useChatStore.setState({ composer: "正在打的下一句" } as never)
  runs[0].resolve({ ok: true, runId: x.s1, userMessageId: "u_s1" })
  await x.p1
  await flush()
  const st = useChatStore.getState()
  assert.equal(st.composer, "正在打的下一句", "输入框原样，没把 S1 塞回来（再发就是重复的一句）")
  assert.equal(st.error, null, "没有「发送失败」红卡")
  assert.equal(pending.pendingFailedSendFor(x.sessionId), null, "不记成「失败那条还没发出去」")
  assert.equal(userTurns("S1 text"), 1, "S1 用户句只有一条")
  assert.equal(userTurns("S2 text"), 1, "S2 用户句只有一条")
  assert.ok(!calls.some((c) => c.path === ".session.delete"), "不删会话")
})

test("对照：起步窗口里没停，回执到了照常认领（新加的闸不误伤）", async () => {
  const { sessionId, s1 } = idle("plain")
  const p1 = sendComposerMessage(undefined, "S1 text", att("S1 text"))
  await untilRuns(1)
  runs[0].resolve({ ok: true, runId: s1, userMessageId: "u_s1" })
  await p1
  await flush()
  assert.equal(useChatStore.getState().runId, s1)
  assert.ok(!aborted(s1))
  dispatchAgentEvent(card(s1, sessionId))
  assert.equal(useChatStore.getState().pendingApproval?.runId, s1)
})
