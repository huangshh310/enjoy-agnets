/**
 * 出字前回滚后，迟到的同 run.start 不得再补用户泡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { useChatStore } from "./chat-store.ts"
import { resetDiscardedPreOutputRunsForTest } from "./discarded-pre-output-runs.ts"
import type { ThreadMessage } from "./chat-store.types.ts"

const pending: ThreadMessage[] = [
  { id: "msg_user_1", role: "user", content: "hello", createdAt: 1 },
  { id: "msg_1", role: "assistant", content: "", createdAt: 2, streaming: true }
]

test("出字前失败立刻撕泡，迟到 run.start 不再补用户句", () => {
  resetDiscardedPreOutputRunsForTest()
  useChatStore.setState({
    messages: pending,
    running: true,
    runId: null,
    pendingStreamEvents: [],
    composer: ""
  })
  useChatStore.getState().applyStreamEvent({
    type: "run.error",
    runId: "run_late",
    message: "provider_unreachable",
    code: "provider_unreachable",
    preOutput: false
  })
  assert.equal(useChatStore.getState().messages.length, 0)
  assert.equal(useChatStore.getState().composer, "hello")
  assert.equal(useChatStore.getState().pendingStreamEvents.length, 0)
  useChatStore.getState().applyStreamEvent({
    type: "run.start",
    runId: "run_late",
    sessionId: "ses_a",
    kind: "agent",
    prompt: "hello"
  })
  assert.equal(useChatStore.getState().messages.length, 0)
})
