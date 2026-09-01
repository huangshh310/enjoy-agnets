/**
 * Stop 在 runId 为空时也必须能停；切会话后不得再认领旧 run。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadMessage } from "../stores/chat-store.types.ts"
import { canClaimComposerRun, isEmptyStreamingAssistant } from "./composer-run-policy.ts"

function pendingAssistant(content = ""): ThreadMessage {
  return {
    id: "msg_pending_1",
    role: "assistant",
    content,
    createdAt: 1,
    streaming: true,
    reasoning: "",
    tools: []
  }
}

test("空 Thinking 壳判定为空 pending，有正文则不是", () => {
  assert.equal(isEmptyStreamingAssistant(pendingAssistant()), true)
  assert.equal(isEmptyStreamingAssistant(pendingAssistant("上海今天")), false)
  assert.equal(isEmptyStreamingAssistant(undefined), false)
})

test("只有仍在 running 且还是同一会话才能认领 runId", () => {
  assert.equal(
    canClaimComposerRun({ running: true, sessionId: "sess_old", startedSessionId: "sess_old" }),
    true
  )
  assert.equal(
    canClaimComposerRun({ running: false, sessionId: "sess_old", startedSessionId: "sess_old" }),
    false
  )
  assert.equal(
    canClaimComposerRun({ running: true, sessionId: "sess_new", startedSessionId: "sess_old" }),
    false
  )
})
