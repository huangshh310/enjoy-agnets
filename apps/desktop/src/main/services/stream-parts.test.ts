import assert from "node:assert/strict"
import { test } from "node:test"
import { mapStreamPart } from "./stream-parts.ts"

test("maps AI SDK 7 reasoning-delta text", () => {
  const event = mapStreamPart({ type: "reasoning-delta", text: "先列约束" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "先列约束" })
})

test("maps fullStream reasoning parts that use delta instead of text", () => {
  const event = mapStreamPart({ type: "reasoning-delta", delta: "下一步" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "下一步" })
})

test("maps result.stream reasoning chunks", () => {
  const event = mapStreamPart({ type: "reasoning", text: "完整思考" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "完整思考" })
})

test("maps leaked reasoning_content from OpenAI-compatible payloads", () => {
  const event = mapStreamPart(
    { type: "reasoning-delta", reasoning_content: "来自 DeepSeek" },
    "run_1"
  )
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "来自 DeepSeek" })
})

test("ignores empty reasoning-start bookends", () => {
  assert.equal(mapStreamPart({ type: "reasoning-start", id: "reasoning-0" }, "run_1"), null)
})
