/**
 * leo MUST 1 / 2（#136）：出字前回滚走 store.applyStreamEvent 的真实路径。
 * - preOutput=true 且本轮没出字：撕泡还草稿；迟到的同 runId run.start 不再补泡（isDiscardedPreOutputRun 闸）。
 * - 迟到的 preOutput 失败（这轮已出字 / 已结束 / runId 还没认领但没在跑）：不得撕掉已出的回复和它的用户句。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const { useChatStore } = await import("./chat-store.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("./discarded-pre-output-runs.ts")

beforeEach(() => resetDiscardedPreOutputRunsForTest())

const preOutputError = (runId: string) =>
  ({ type: "run.error", runId, message: "provider_unreachable", code: "provider_unreachable", preOutput: true }) as never

function seed(opts: { running: boolean; runId: string | null; assistant: string }) {
  useChatStore.setState({
    sessionId: "ses_p",
    running: opts.running,
    runId: opts.runId,
    composer: "",
    error: null,
    pendingStreamEvents: [],
    messages: [
      { id: "u_old", role: "user", content: "早先", createdAt: 1 },
      { id: "a_old", role: "assistant", content: "早先的回复", createdAt: 2 },
      { id: "u_new", role: "user", content: "这一轮", createdAt: 3 },
      { id: "a_new", role: "assistant", content: opts.assistant, createdAt: 4, streaming: opts.running }
    ]
  } as never)
}

test("preOutput=true 且本轮没出字：撕掉本轮气泡、字回输入框；迟到的 run.start 不再补泡", () => {
  seed({ running: true, runId: "run_a", assistant: "" })
  useChatStore.getState().applyStreamEvent(preOutputError("run_a"))
  let state = useChatStore.getState()
  assert.deepEqual(state.messages.map((m) => m.id), ["u_old", "a_old"])
  assert.equal(state.composer, "这一轮")
  assert.equal(state.running, false)
  useChatStore.getState().applyStreamEvent({ type: "run.start", runId: "run_a", prompt: "这一轮" } as never)
  state = useChatStore.getState()
  assert.deepEqual(state.messages.map((m) => m.id), ["u_old", "a_old"], "迟到 run.start 不补泡")
  assert.equal(state.running, false)
})

test("迟到的 preOutput 失败（同 runId，这轮已出字）：已出的回复和用户句都留着", () => {
  seed({ running: true, runId: "run_b", assistant: "已经吐出来的字" })
  useChatStore.getState().applyStreamEvent(preOutputError("run_b"))
  const state = useChatStore.getState()
  assert.deepEqual(state.messages.map((m) => m.id), ["u_old", "a_old", "u_new", "a_new"])
  assert.equal(state.messages.at(-1)?.content, "已经吐出来的字")
})

test("runId 还没认领（空）但这一轮已结束：晚到的 preOutput 失败不回滚", () => {
  seed({ running: false, runId: null, assistant: "" })
  useChatStore.getState().applyStreamEvent(preOutputError("run_c"))
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["u_old", "a_old", "u_new", "a_new"])
  assert.equal(useChatStore.getState().composer, "")
})

test("runId 还没认领（空）、没在跑、上一轮已有回复：晚到的 preOutput 失败不撕上一轮", () => {
  seed({ running: false, runId: null, assistant: "完整回复" })
  useChatStore.getState().applyStreamEvent(preOutputError("run_d"))
  assert.deepEqual(useChatStore.getState().messages.map((m) => m.id), ["u_old", "a_old", "u_new", "a_new"])
})
