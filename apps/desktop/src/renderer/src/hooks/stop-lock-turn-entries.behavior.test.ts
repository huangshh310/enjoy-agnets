/**
 * E1 / leo C1b：绕过 sendComposerOnce、直接打 agent.run 的四个入口——重新生成 / 编辑重发 / 失败轮重试 / Todo「继续」。
 * 停止后 running 已落下，只看 running 挡不住：本会话收尾没落定（正在停下… / 没能停下）时一律不开新一轮，
 * 且在截断历史 / 改消息之前就挡——消息、错误条、输入框都原样。别的会话照常；落定后照常。
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
      if (path === ".agent.run") return Promise.resolve({ ok: true, runId: `run_c1b_${++runSeq}` })
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const S = await import("../stores/stop-settle.ts")
const { regenerateAssistantTurn, editAndResendUserTurn, retryFailedUserTurn } = await import("./regenerate-turn.ts")
const { continueTodoTurn } = await import("./continue-todo-turn.ts")
const { resetClientRequestIdForTest } = await import("./runtime-interact/client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./runtime-interact/composer-running-owner.ts")
const { resetStoppedRunsForTest } = await import("./stopped-runs.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
const agentRuns = () => calls.filter((c) => c.path === ".agent.run")
const truncations = () => calls.filter((c) => /truncate/i.test(c.path) || c.arg?.truncateAfterMessageId)
const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n")

afterEach(() => {
  calls.length = 0
  S.resetStopSettleForTest()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  resetStoppedRunsForTest()
})

const THREAD = [
  { id: "u0", role: "user", content: "写个文件", createdAt: 1 },
  { id: "a0", role: "assistant", content: "写了一半", createdAt: 2 }
]
let seq = 0
/** 会话刚点了停止：running 已落下（run.error 到了），收尾还没落定；stuck = 「没能停下」。 */
function stoppingSession(phase: "stopping" | "stuck" = "stuck") {
  seq += 1
  const sessionId = `ses_c1b_${seq}`
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", error: "已停止", notice: null,
    pendingApproval: null, hasKey: true, modelId: "stub-e2e", runtimeId: "enjoy-local", pendingStreamEvents: [],
    preparingHint: false, preparingSessionId: null,
    repositories: [{ id: sessionId, workflowStatus: "todo" }],
    messages: THREAD.map((m) => ({ ...m }))
  } as never)
  const clock = 1_000
  S.resetStopSettleForTest(() => clock)
  S.beginStopSettle(sessionId, `run_old_${seq}`, ["t1"])
  S.noteStopSettleEvent({ type: "run.error", runId: `run_old_${seq}`, sessionId, error: "aborted", settling: { deadlineAt: clock + 60_000, stopRequestedAt: clock } } as never)
  if (phase === "stuck") {
    S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "stuck", receipt: { write: "maybe_partial", tools: [] } } as never)
  }
  assert.equal(S.isStopLocked(sessionId), true, "前提：本会话在收尾")
  assert.equal(useChatStore.getState().running, false, "前提：running 已落下（只看 running 挡不住）")
  return sessionId
}
function settle(sessionId: string) {
  S.noteStopSettleEvent({ type: "run.stopped", runId: `run_old_${seq}`, sessionId, phase: "final", receipt: { write: "maybe_partial", tools: [] } } as never)
  assert.equal(S.isStopLocked(sessionId), false, "前提：已落定")
}
/** 什么都没动：没有新 run、没截断、消息原样、running 没被占、错误条还在。 */
function assertUntouched(label: string) {
  const s = useChatStore.getState()
  assert.equal(agentRuns().length, 0, `${label}：没有新的 agent.run`)
  assert.equal(truncations().length, 0, `${label}：没截断历史`)
  assert.deepEqual(s.messages.map((m) => [m.id, m.role, m.content]), THREAD.map((m) => [m.id, m.role, m.content]), `${label}：消息原样，不出新气泡`)
  assert.equal(s.running, false, `${label}：没占 running`)
  assert.equal(s.error, "已停止", `${label}：错误条没被清`)
}

test("C1b ①：没能停下时点助手气泡「重新生成」（regenerateAssistantTurn）不开新一轮、不截断", async () => {
  stoppingSession("stuck")
  await regenerateAssistantTurn("a0")
  await flush()
  assertUntouched("重新生成")
})

test("C1b ②：正在停下时保存编辑过的用户气泡（editAndResendUserTurn）不发、不改消息，返回 stop-locked 让编辑框留着", async () => {
  stoppingSession("stopping")
  const outcome = await editAndResendUserTurn("u0", "改过的这句")
  await flush()
  assert.equal(outcome, "stop-locked")
  assertUntouched("编辑重发")
  assert.match(
    src("../components/ai-chat/thread/turns/user-turn.tsx"),
    /if \(outcome !== "stop-locked"\) setIsEditing\(false\)/,
    "没发出去时编辑框不收起，改过的字留着"
  )
})

test("C1b ③：出错横幅「重试」（retryFailedUserTurn）收尾期间不重跑，也不往输入框还稿", async () => {
  stoppingSession("stuck")
  useChatStore.getState().setComposer("我后来打的字")
  const started = await retryFailedUserTurn({ id: "u0", content: "写个文件" })
  await flush()
  assert.equal(started, false)
  assertUntouched("重试")
  assert.equal(useChatStore.getState().composer, "我后来打的字", "输入框原样")
})

test("C1b ③b：没有 id 的失败轮重试，收尾期间同样不还稿", async () => {
  stoppingSession("stuck")
  const started = await retryFailedUserTurn({ content: "写个文件" })
  await flush()
  assert.equal(started, false)
  assert.equal(useChatStore.getState().composer, "", "没把原话塞回输入框")
  assertUntouched("重试（无 id）")
})

test("C1b ④：没能停下时点 Todo Dock「继续」（continueTodoTurn）不开新一轮、不出待回复气泡", async () => {
  stoppingSession("stuck")
  await continueTodoTurn()
  await flush()
  assertUntouched("Todo 继续")
})

test("C1b：别的会话不受影响——A 在收尾，B 照常能「继续」/「重新生成」", async () => {
  const a = stoppingSession("stuck")
  const b = `ses_c1b_other_${seq}`
  useChatStore.setState({ sessionId: b, repositories: [{ id: b, workflowStatus: "todo" }], messages: THREAD.map((m) => ({ ...m })) } as never)
  await continueTodoTurn()
  await flush()
  assert.equal(S.isStopLocked(a), true, "A 仍在收尾")
  assert.equal(agentRuns().length, 1, "B 的继续发出去了")
  assert.equal(agentRuns()[0].arg.sessionId, b)
})

test("C1b：落定后同一会话照常能「继续」和「重新生成」", async () => {
  const sid = stoppingSession("stuck")
  await continueTodoTurn()
  assert.equal(agentRuns().length, 0)
  settle(sid)
  await continueTodoTurn()
  await flush()
  assert.equal(agentRuns().length, 1)
  assert.equal(agentRuns()[0].arg.sessionId, sid)
  useChatStore.setState({ running: false, messages: THREAD.map((m) => ({ ...m })) } as never)
  calls.length = 0
  await regenerateAssistantTurn("a0")
  await flush()
  assert.equal(agentRuns().length, 1, "落定后重新生成照常起跑")
})

test("C1b：流水线「启动」在当前会话里跑 agent.run，收尾期间同样先挡", () => {
  assert.match(
    src("../components/workflows/workflows-page.tsx"),
    /if \(!sessionId \|\| isStarting\) return\n\s*\/\/[^\n]*\n\s*if \(isStopLocked\(sessionId\)\) return\n\s*setIsStarting\(true\)/,
    "startPipeline 在 workflow.start 之前判 isStopLocked"
  )
})
