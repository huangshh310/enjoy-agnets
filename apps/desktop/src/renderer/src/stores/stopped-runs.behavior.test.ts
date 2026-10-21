/**
 * #160 巡检第 6 项：「很慢」那一轮在等写入审批时点停止，abort IPC 还没到 main，那一轮迟到的 approval.required
 * 以前会把审批卡重新挂出来（running 也被置回 true）。真走 abortComposerRun → dispatchAgentEvent / applyStreamEvent。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: string[] = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, _args) => {
      calls.push(path)
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { useChatStore } = await import("./chat-store.ts")
const { useAttentionStore } = await import("./attention/attention-store.ts")
const { dispatchAgentEvent } = await import("./attention/dispatch-agent-event.ts")
const { abortComposerRun } = await import("../hooks/composer-run-control.ts")
const stopped = await import("./stopped-runs.ts")

afterEach(() => {
  stopped.resetStoppedRunsForTest()
  useAttentionStore.setState({ items: [], parks: {}, runSessions: {} } as never)
  calls.length = 0
})

function waitingOnWrite(sessionId: string, runId: string) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId,
    error: null,
    notice: null,
    pendingStreamEvents: [],
    pendingApproval: approval(sessionId, runId, "ap_1"),
    messages: [
      { id: "u1", role: "user", content: "very slow，写个文件", createdAt: 1 },
      { id: "a1", role: "assistant", content: "准备写入", createdAt: 2, streaming: true }
    ]
  } as never)
}
function approval(sessionId: string, runId: string, approvalId: string) {
  return { type: "approval.required", runId, sessionId, approvalId, toolCallId: `tc_${approvalId}`, name: "write_file", args: { path: "a.txt" } } as never
}
const approvalsFor = (sessionId: string) =>
  useAttentionStore.getState().items.filter((item: any) => item.sessionId === sessionId && item.kind === "pending_approval")

test("停止后那一轮迟到的 approval.required：审批卡不再冒回来、running 不被置回、Attention 不挂待审批", async () => {
  waitingOnWrite("ses_slow", "run_slow")
  await abortComposerRun()
  assert.equal(useChatStore.getState().pendingApproval, null)
  assert.ok(calls.includes(".ai.abort"), "abort 照常发给 main")
  dispatchAgentEvent(approval("ses_slow", "run_slow", "ap_2"))
  const s = useChatStore.getState()
  assert.equal(s.pendingApproval, null, "审批卡没回来")
  assert.equal(s.running, false, "没被置回运行中")
  assert.deepEqual(approvalsFor("ses_slow"), [], "侧栏不挂待审批")
  assert.equal(useAttentionStore.getState().parks["ses_slow"], undefined, "也没停车出一张卡")
})

test("切回会话时补卡（hydrate 直接 applyStreamEvent）也认被停的 run", async () => {
  waitingOnWrite("ses_slow2", "run_slow2")
  await abortComposerRun()
  useChatStore.getState().applyStreamEvent(approval("ses_slow2", "run_slow2", "ap_9"))
  assert.equal(useChatStore.getState().pendingApproval, null)
})

test("迟到的出字也丢掉；终态 run.error / run.end 照常放行（不复活这一轮）", async () => {
  waitingOnWrite("ses_slow3", "run_slow3")
  await abortComposerRun()
  const before = JSON.stringify(useChatStore.getState().messages)
  dispatchAgentEvent({ type: "text.delta", runId: "run_slow3", sessionId: "ses_slow3", text: "迟到的字" } as never)
  assert.equal(JSON.stringify(useChatStore.getState().messages), before, "迟到的字没进线程")
  assert.equal(stopped.isLateEventOfStoppedRun({ type: "run.end", runId: "run_slow3" } as never), false)
  assert.equal(stopped.isLateEventOfStoppedRun({ type: "run.error", runId: "run_slow3", message: "aborted" } as never), false)
  assert.equal(stopped.isLateEventOfStoppedRun({ type: "message.persisted", runId: "run_slow3" } as never), false)
  dispatchAgentEvent({ type: "run.end", runId: "run_slow3", sessionId: "ses_slow3" } as never)
  assert.equal(useChatStore.getState().running, false)
  assert.equal(useChatStore.getState().pendingApproval, null)
})

test("对照：新开的一轮（别的 runId）审批照常挂出来；记录按会话分开", async () => {
  waitingOnWrite("ses_slow4", "run_old")
  await abortComposerRun()
  useChatStore.setState({ running: true, runId: "run_new" } as never)
  dispatchAgentEvent(approval("ses_slow4", "run_new", "ap_new"))
  assert.equal((useChatStore.getState().pendingApproval as any)?.approvalId, "ap_new")
  assert.equal(stopped.isStoppedRun("run_old", "ses_slow4"), true)
  assert.equal(stopped.isStoppedRun("run_old", "ses_other"), false)
  assert.equal(stopped.isStoppedRun("run_new"), false)
})

test("每个会话最多记 8 个，旧的挤掉", () => {
  for (let i = 0; i < 10; i++) stopped.rememberStoppedRun("ses_cap", `run_${i}`)
  assert.equal(stopped.isStoppedRun("run_0"), false)
  assert.equal(stopped.isStoppedRun("run_1"), false)
  assert.equal(stopped.isStoppedRun("run_9"), true)
})
