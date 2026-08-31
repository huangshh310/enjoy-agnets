import assert from "node:assert/strict"
import { test } from "node:test"
import { composerRunKind } from "./composer-run-kind.ts"

test("grok-imagine 走 generateImage，不走 Agent ToolLoop", () => {
  assert.equal(composerRunKind("grok-imagine-image-2.0"), "image")
  assert.equal(composerRunKind("grok-imagine-image"), "image")
  assert.equal(composerRunKind("grok-imagine-video"), "video")
})

test("聊天模型仍走 Agent", () => {
  assert.equal(composerRunKind("grok-4.6", ["text", "tools", "vision"]), "agent")
  assert.equal(composerRunKind("gpt-4o", ["text", "tools", "vision", "image"]), "agent")
})
