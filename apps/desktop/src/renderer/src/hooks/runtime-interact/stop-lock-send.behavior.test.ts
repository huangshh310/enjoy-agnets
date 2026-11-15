/**
 * E1 M2 / leo C1：发送锁下沉到 sendComposerMessage（所有开新一轮的入口共用的口）。
 * 本会话收尾没落定（正在停下… / 没能停下）时：⌘/Ctrl+Enter、执行计划、⌘L ACP 命令、排队行「立即发送」都不开新一轮；
 * 草稿 / Chip 不丢、不出假的用户气泡，「立即发送」的排队项留在队里。别的会话照常能发；落定后照常能发。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const calls: Array<{ path: string; arg: any }> = []
let runSeq = 0
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      calls.push({ path, arg: args[0] })
      if (path === ".agent.run") return Promise.resolve({ ok: true, runId: `run_lock_${++runSeq}` })
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../../stores/chat-store.ts")
const S = await import("../../stores/stop-settle.ts")
const { sendComposerMessage, submitComposer } = await import("../send-composer.ts")
const { sendFollowupNow } = await import("./followup-actions.ts")
const queue = await import("../followup-queue.ts")
const { setQuotedContexts, listQuotedContexts } = await import("../quoted-context.ts")
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const { resetStoppedRunsForTest } = await import("../stopped-runs.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
const agentRuns = () => calls.filter((c) => c.path === ".agent.run")
const userBubbles = () => useChatStore.getState().messages.filter((m) => m.role === "user").length
const quote = { id: "q1", source: "file", label: "a.ts", text: "hello" } as never

afterEach(() => {
  calls.length = 0
  S.resetStopSettleForTest()
  queue.resetFollowupsForTest()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  resetStoppedRunsForTest()
  setQuotedContexts([])
})

let seq = 0
/** 会话 A 刚点了停止：running 已落下（run.error 到了），但收尾还没落定。 */
function stoppingSession(phase: "stopping" | "stuck" = "stopping") {
  seq += 1
  const sessionId = `ses_lock_${seq}`
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", error: null, notice: null,
    pendingApproval: null, hasKey: true, modelId: "stub-e2e", runtimeId: "enjoy-local", pendingStreamEvents: [],
    preparingHint: false, preparingSessionId: null,
    repositories: [{ id: sessionId, workflowStatus: "todo" }],
    messages: [
      { id: "u0", role: "user", content: "写个文件", createdAt: 1 },
      { id: "a0", role: "assistant", content: "", createdAt: 2 }
    ]
  } as never)
  const clock = 1_000
  S.resetStopSettleForTest(() => clock)
  S.beginStopSettle(sessionId, `run_old_${seq}`, ["t1"])
  S.noteStopSettleEvent({ type: "run.error", runId: `run_old_${seq}`, sessionId, error: "aborted", settling: { deadlineAt: clock + 60_000, stopRequestedAt: clock } } as never)
  // 「没能停下」用 main 的 run.stopped stuck 进（与 8s 本地计时同一节点，reducer 已有单测）。
  if (phase === "stuck") markStuck(sessionId)
  assert.equal(S.isStopLocked(sessionId), true, "前提：本会话在收尾")
  return sessionId
}
function markStuck(sessionId: string) {
  S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "stuck", receipt: { write: "maybe_partial", tools: [] } } as never)
}
function settle(sessionId: string) {
  S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "final", receipt: { write: "maybe_partial", tools: [] } } as never)
  assert.equal(S.isStopLocked(sessionId), false, "前提：已落定")
}

test("C1 ①：没能停下时同一会话 ⌘/Ctrl+Enter（running 已落下）不开新一轮，草稿和引用 Chip 都还在、不出假气泡", async () => {
  const sid = stoppingSession("stuck")
  assert.equal(S.useStopSettleStore.getState().bySession[sid].phase, "stuck")
  useChatStore.getState().setComposer("再来一句")
  setQuotedContexts([quote])
  const before = userBubbles()
  await submitComposer("steer")
  await flush()
  assert.equal(agentRuns().length, 0, "没有新的 agent.run")
  assert.equal(useChatStore.getState().composer, "再来一句", "草稿原样")
  assert.equal(listQuotedContexts().length, 1, "引用 Chip 没被取走")
  assert.equal(userBubbles(), before, "没有假的用户消息")
})

test("C1 ①b：正在停下时 Enter（send）同样不发；steer 退回路径也不清草稿", async () => {
  const sid = stoppingSession("stopping")
  useChatStore.getState().setComposer("正在停下时打的字")
  await submitComposer("send")
  const { steerPreparedText } = await import("./steer-composer.ts")
  const outcome = await steerPreparedText("正在停下时打的字")
  await flush()
  assert.equal(outcome, "requeue")
  assert.equal(agentRuns().length, 0)
  assert.equal(useChatStore.getState().composer, "正在停下时打的字")
  assert.equal(S.isStopLocked(sid), true)
})

test("C1 ②：执行计划（plan-card → sendComposerMessage executePlan）在收尾期间不开新一轮", async () => {
  stoppingSession("stopping")
  const before = userBubbles()
  await sendComposerMessage({ content: "按计划执行", executePlan: true })
  await flush()
  assert.equal(agentRuns().length, 0)
  assert.equal(userBubbles(), before)
  const src = readFileSync(new URL("../../components/ai-chat/composer/plan-card.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  assert.match(src, /void sendComposerMessage\(\{ content: t\("chat\.executePlanPrompt"\), executePlan: true \}\)/, "执行计划走的就是加了锁的那个口")
})

test("C1 ③：⌘L 里的 ACP 命令（quick-search → sendComposerMessage）在收尾期间不开新一轮", async () => {
  stoppingSession("stuck")
  const before = userBubbles()
  await sendComposerMessage({ content: "/compact" })
  await flush()
  assert.equal(agentRuns().length, 0)
  assert.equal(userBubbles(), before)
  const src = readFileSync(new URL("../../components/search/quick-search-acp-commands.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  assert.match(src, /void sendComposerMessage\(\{ content: `\/\$\{command\.name\}` \}\)/, "ACP 命令走的就是加了锁的那个口")
})

test("C1 ④：排队行「立即发送」在收尾期间不发，排队项留在队里", async () => {
  const sid = stoppingSession("stopping")
  const item = queue.enqueueFollowup({ sessionId: sid, prompt: "排着的那句" })
  await sendFollowupNow(item)
  await flush()
  assert.equal(agentRuns().length, 0)
  assert.deepEqual(queue.listFollowups(sid).map((f) => f.prompt), ["排着的那句"], "排队项原样留着")
})

test("C1：别的会话不受影响——A 在收尾，切到 B 照常能发（§2.6）", async () => {
  const a = stoppingSession("stuck")
  const b = `ses_lock_other_${seq}`
  useChatStore.setState({ sessionId: b, repositories: [{ id: b, workflowStatus: "done" }], messages: [] } as never)
  await sendComposerMessage({ content: "B 会话的新一句" })
  await flush()
  assert.equal(S.isStopLocked(a), true, "A 仍在收尾")
  assert.equal(agentRuns().length, 1, "B 发出去了")
  assert.equal(agentRuns()[0].arg.sessionId, b)
})

test("C1：落定后同一会话照常能发", async () => {
  const sid = stoppingSession("stuck")
  await sendComposerMessage({ content: "收尾前" })
  assert.equal(agentRuns().length, 0)
  settle(sid)
  await sendComposerMessage({ content: "落定后的新一句" })
  await flush()
  assert.equal(agentRuns().length, 1)
  assert.equal(agentRuns()[0].arg.sessionId, sid)
})
