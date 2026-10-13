import assert from "node:assert/strict"
import { test } from "node:test"
import { preparingHintVisible } from "./preparing-hint-visible.ts"

test("A 在准备时，空新对话（sessionId 空或别的会话）不画「正在准备…」", () => {
  assert.equal(
    preparingHintVisible({ preparingHint: true, preparingSessionId: "ses_a", sessionId: "ses_a" }),
    true
  )
  assert.equal(
    preparingHintVisible({ preparingHint: true, preparingSessionId: "ses_a", sessionId: null }),
    false
  )
  assert.equal(
    preparingHintVisible({ preparingHint: true, preparingSessionId: "ses_a", sessionId: "ses_b" }),
    false
  )
})

test("建会话窗（还没 id）：只在前台也还没会话时画", () => {
  assert.equal(
    preparingHintVisible({ preparingHint: true, preparingSessionId: null, sessionId: null }),
    true
  )
  assert.equal(
    preparingHintVisible({ preparingHint: true, preparingSessionId: null, sessionId: "ses_x" }),
    false
  )
})

test("没在准备：不画", () => {
  assert.equal(
    preparingHintVisible({ preparingHint: false, preparingSessionId: "ses_a", sessionId: "ses_a" }),
    false
  )
})
