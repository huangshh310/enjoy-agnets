/**
 * Stop 在 runId 为空时也必须能停；切走后不得把旧 runId 写进当前会话 UI。
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

test("只有仍在前台 running 且还是同一会话才能把 runId 写进 Composer", () => {
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
