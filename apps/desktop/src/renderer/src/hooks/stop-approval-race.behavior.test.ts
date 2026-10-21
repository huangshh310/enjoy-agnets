/**
 * jojo 巡检 211e3bbb 1c / luna：审批卡刚到的那一刻点停止。
 * 真走 abortComposerRun / dispatchAgentEvent / decidePendingApproval / claimComposerRun：
 * 停在审批卡之前、之中、之后，卡都不再挂回来、停止按钮和「执行中」都落下、排队停在 stopped；
 * 停止后点批准 / 拒绝什么都不发、不出红卡；「从这里重来」不被挡。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; arg: any }> = []
/** main 里已经停掉的 run：decide 像真 main 一样抛「no longer active」。 */
const mainStopped = new Set<string>()
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      calls.push({ path, arg: args[0] })
      if (path === ".ai.abort") mainStopped.add(String(args[0]))
      if (path === ".agent.decide") {
        // 真 IPC 有来回：main 在回包时才判这一轮还在不在。
        const runId = String(args[0]?.runId)
        return new Promise((resolve, reject) =>
          setTimeout(() =>
            mainStopped.has(runId)
              ? reject(new Error("Error invoking remote method 'agent.decide': Error: This agent run is no longer active."))
              : resolve(undefined)
          )
        )
      }
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
const { abortComposerRun, claimComposerRun } = await import("./composer-run-control.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const { decidePendingApproval } = await import("./decide-pending-approval.ts")
const { rewindFromUserTurn } = await import("./rewind-from-here.ts")
const queue = await import("./followup-queue.ts")
const { resetStoppedRunsForTest } = await import("./stopped-runs.ts")

afterEach(() => {
  calls.length = 0
  mainStopped.clear()
  queue.resetFollowupsForTest()
  resetStoppedRunsForTest()
})

let seq = 0
function running(tag: string, opts?: { unclaimed?: boolean }) {
  seq += 1
  const sessionId = `ses_${tag}_${seq}`
  const runId = `run_${tag}_${seq}`
  useAttentionStore.getState().rememberRun(runId, sessionId)
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId: opts?.unclaimed ? null : runId,
    runtimeId: "enjoy-local",
    composer: "",
    error: null,
    notice: null,
    pendingApproval: null,
    hasKey: true,
    pendingStreamEvents: [],
    messages: [
      { id: "u1", role: "user", content: "very slow", createdAt: 1 },
      { id: "a1", role: "assistant", content: "one two", createdAt: 2, streaming: true, runId }
    ]
  } as never)
  queue.enqueueFollowup({ sessionId, prompt: "排队一", assets: [] })
  return { sessionId, runId }
}

function approval(runId: string, sessionId: string) {
  return {
    type: "approval.required",
    runId,
    sessionId,
    approvalId: `apr_${runId}`,
    toolCallId: `tool_${runId}`,
    name: "write_file",
    args: { path: "e2e-stub.txt", content: "x" }
  } as never
}
/** main 停掉这一轮时推的两条：未决结清 + 停止收尾。 */
function mainAbortEvents(runId: string, sessionId: string, withResolved: boolean) {
  if (withResolved) {
    dispatchAgentEvent({ type: "approval.resolved", runId, sessionId, toolCallId: `tool_${runId}`, decision: "cancelled", code: "user_aborted" } as never)
  }
  dispatchAgentEvent({ type: "run.error", runId, sessionId, message: "Stopped by user.", code: "user_aborted", preOutput: false } as never)
}

function assertStoppedUi(sessionId: string, label: string) {
  const store = useChatStore.getState()
  assert.equal(store.pendingApproval, null, `${label}：审批卡不在`)
  assert.equal(store.running, false, `${label}：停止按钮 / 执行中落下`)
  assert.equal(store.error, null, `${label}：没有红卡`)
  const stuck = useAttentionStore.getState().items.filter(
    (item) =>
      item.sessionId === sessionId &&
      item.kind === "pending_approval" &&
      (item.status === "active" || item.status === "focused")
  )
  assert.equal(stuck.length, 0, `${label}：Inbox 不留这张卡`)
  assert.equal(queue.followupPausedReason(sessionId), "stopped", `${label}：排队停在 stopped`)
}

test("停在审批卡到达之前：迟到的 approval.required 丢掉，卡 / 停止按钮 / 执行中都不回来", async () => {
  const { sessionId, runId } = running("before")
  await abortComposerRun()
  // main 里这一轮已移出内存，迟到的事件不带 sessionId（renderer 按 runId 认会话）。
  const late = approval(runId, sessionId) as any
  delete late.sessionId
  dispatchAgentEvent(late)
  assertStoppedUi(sessionId, "迟到的卡")
  assert.ok(calls.some((c) => c.path === ".ai.abort" && c.arg === runId), "停止发了 abort")
})

test("停在审批卡途中（卡和停止在 IPC 上交错）：卡不挂回来；main 随后的结清 + 收尾也不出红卡", async () => {
  const { sessionId, runId } = running("during")
  await abortComposerRun()
  dispatchAgentEvent(approval(runId, sessionId))
  assertStoppedUi(sessionId, "交错的卡")
  mainAbortEvents(runId, sessionId, true)
  assertStoppedUi(sessionId, "main 收尾后")
})

test("停在审批卡出来之后：卡清掉；main 的结清 + 收尾到了也不出红卡，排队仍是 stopped", async () => {
  const { sessionId, runId } = running("after")
  dispatchAgentEvent(approval(runId, sessionId))
  assert.ok(useChatStore.getState().pendingApproval, "卡先到了")
  await abortComposerRun()
  assertStoppedUi(sessionId, "点停止后")
  mainAbortEvents(runId, sessionId, true)
  assertStoppedUi(sessionId, "main 收尾后")
})

test("停止后点批准 / 拒绝：不再发 decide、不出红卡，卡直接收掉", async () => {
  for (const decision of ["allow", "deny"] as const) {
    const { sessionId, runId } = running(`decide_${decision}`)
    const card = approval(runId, sessionId) as any
    dispatchAgentEvent(card)
    await abortComposerRun()
    // 卡还挂在别处（Dock / 旧渲染）时用户照点：
    useChatStore.setState({ pendingApproval: card, runId } as never)
    calls.length = 0
    await decidePendingApproval(decision)
    assert.ok(!calls.some((c) => c.path === ".agent.decide"), `${decision}：不发 decide`)
    assert.equal(useChatStore.getState().error, null, `${decision}：没有红卡`)
    assert.equal(useChatStore.getState().pendingApproval, null, `${decision}：卡收掉`)
  }
})

test("decide 已经在路上时点了停止：main 回「no longer active」也不出红卡", async () => {
  const { sessionId, runId } = running("decide_inflight")
  const card = approval(runId, sessionId) as any
  dispatchAgentEvent(card)
  const pending = decidePendingApproval("allow")
  mainStopped.add(runId)
  await abortComposerRun()
  await pending
  assert.equal(useChatStore.getState().error, null)
})

test("起步窗口（runId 还没认领）里停止：随后冒出的审批卡丢掉并 abort 那一轮，认领失败不挂回来", async () => {
  const { sessionId, runId } = running("unclaimed", { unclaimed: true })
  await abortComposerRun()
  dispatchAgentEvent(approval(runId, sessionId))
  assertStoppedUi(sessionId, "起步窗口迟到的卡")
  assert.ok(calls.some((c) => c.path === ".ai.abort" && c.arg === runId), "那一轮在 main 里也被 abort")
  assert.equal(claimComposerRun(sessionId, runId), false, "认领不成功，不把 running 挂回来")
  assert.equal(useChatStore.getState().running, false)
})

test("停止后（卡迟到）「从这里重来」不被 running 挡住", async () => {
  const { sessionId, runId } = running("rewind")
  await abortComposerRun()
  dispatchAgentEvent(approval(runId, sessionId))
  const result = await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false })
  assert.notEqual((result as { code?: string }).code, "REWIND_BUSY")
})

test("对照：没停的一轮审批卡照常挂上、running 照常在", async () => {
  const { sessionId, runId } = running("live")
  dispatchAgentEvent(approval(runId, sessionId))
  assert.equal(useChatStore.getState().pendingApproval?.runId, runId)
  assert.equal(useChatStore.getState().running, true)
})

test("对照：起步窗口停过、之后正常认领的新一轮，空闲时也不会被误丢（认领清掉标记）", async () => {
  const { sessionId } = running("reclaim", { unclaimed: true })
  await abortComposerRun()
  // 用户再发一句：running 起、认领新 runId。
  useChatStore.setState({ running: true } as never)
  const next = `run_reclaim_next_${seq}`
  assert.equal(claimComposerRun(sessionId, next), true)
  dispatchAgentEvent(approval(next, sessionId))
  assert.equal(useChatStore.getState().pendingApproval?.runId, next)
})

/** luna m211-50：起步窗口里停止后，main 迟到的 run.start（kind=agent）把 running 认领回来，随后认领成功、整段跑完。 */
test("起步窗口里停止后迟到的 run.start：停止按钮 /「正在写」不回来，那一轮被 abort，认领失败，后续出字不进前台", async () => {
  const { sessionId, runId } = running("late_start", { unclaimed: true })
  await abortComposerRun()
  dispatchAgentEvent({ type: "run.start", runId, sessionId, kind: "agent", prompt: "very slow" } as never)
  assert.equal(useChatStore.getState().running, false, "停止按钮 /「正在写」不回来")
  assert.equal(useChatStore.getState().runId, null)
  assert.ok(calls.some((c) => c.path === ".ai.abort" && c.arg === runId), "那一轮在 main 里被 abort")
  assert.equal(claimComposerRun(sessionId, runId), false, "agent.run 回执到了也认领不上")
  dispatchAgentEvent({ type: "text.delta", runId, sessionId, text: "three " } as never)
  assert.equal(useChatStore.getState().running, false)
  assert.ok(!useChatStore.getState().messages.some((m) => m.content.includes("three")), "被停那一轮的字不再长")
})

test("对照：起步窗口没停时 run.start 照常认领前台", async () => {
  const { sessionId, runId } = running("start_ok", { unclaimed: true })
  useChatStore.setState({ running: false } as never)
  dispatchAgentEvent({ type: "run.start", runId, sessionId, kind: "agent", prompt: "very slow" } as never)
  assert.equal(useChatStore.getState().running, true)
  assert.equal(useChatStore.getState().runId, runId)
})
