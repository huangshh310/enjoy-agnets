import assert from "node:assert/strict"
import { test } from "node:test"
import { canDecideFileDiff, nextDecision } from "./file-diff-decision.ts"

test("流式或未完成不可决", () => {
  assert.equal(canDecideFileDiff({ streaming: true }), false)
  assert.equal(canDecideFileDiff({ toolState: "input-streaming" }), false)
  assert.equal(canDecideFileDiff({ toolState: "input-available" }), false)
  assert.equal(canDecideFileDiff({ toolState: "output-available" }), true)
})

test("留下 / 丢掉状态机", () => {
  assert.equal(nextDecision("pending", "keep"), "kept")
  assert.equal(nextDecision("pending", "discard"), "discarded")
})
