import assert from "node:assert/strict"
import { test } from "node:test"
import { pickStructuredPartial, repairStructuredPrompt } from "./structured-stream.ts"

test("pickStructuredPartial 识别 object-delta / partial", () => {
  assert.deepEqual(pickStructuredPartial({ type: "object-delta", object: { a: 1 } }), { a: 1 })
  assert.deepEqual(pickStructuredPartial({ type: "text-delta", text: "{" }), undefined)
  assert.deepEqual(pickStructuredPartial({ partial: { name: "x" } }), { name: "x" })
})

test("repairStructuredPrompt 把校验错误折进下一轮 prompt", () => {
  const repaired = repairStructuredPrompt("extract title", new Error("Expected string"))
  assert.match(repaired, /extract title/)
  assert.match(repaired, /Expected string/)
})
