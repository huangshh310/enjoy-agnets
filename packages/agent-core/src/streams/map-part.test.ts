import assert from "node:assert/strict"
import { test } from "node:test"
import { mapStreamPart } from "./map-part.ts"

test("maps AI SDK 7 reasoning-delta text", () => {
  const event = mapStreamPart({ type: "reasoning-delta", text: "先列约束" }, "run_1")
  assert.deepEqual(event, { type: "reasoning.delta", runId: "run_1", text: "先列约束" })
})

test("maps usage and step lifecycle to v2 events", () => {
  assert.deepEqual(mapStreamPart({ type: "text-start", id: "t1" }, "run_1"), {
    type: "message.part.start",
    runId: "run_1",
    partId: "t1",
    partType: "text"
  })
  assert.deepEqual(
    mapStreamPart({ type: "finish", usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 } }, "run_1"),
    { type: "usage.updated", runId: "run_1", inputTokens: 3, outputTokens: 5, totalTokens: 8 }
  )
})
