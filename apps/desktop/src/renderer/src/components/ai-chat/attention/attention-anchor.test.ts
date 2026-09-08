import assert from "node:assert/strict"
import { test } from "node:test"
import { ATTENTION_ANCHOR, attentionAnchorId } from "./attention-anchor.ts"

test("点胶囊按 kind 落到 Dock / 错误 / 本轮 turn，不另造壳", () => {
  assert.equal(attentionAnchorId("pending_approval"), ATTENTION_ANCHOR.dock)
  assert.equal(attentionAnchorId("ask_user"), ATTENTION_ANCHOR.dock)
  assert.equal(attentionAnchorId("error"), ATTENTION_ANCHOR.error)
  assert.equal(attentionAnchorId("complete"), ATTENTION_ANCHOR.complete)
  assert.equal(attentionAnchorId(), null)
})
