import assert from "node:assert/strict"
import { test } from "node:test"
import { acceptStreamEvent } from "./accept-stream-event.ts"

test("合法 StreamEvent 放行", () => {
  const event = acceptStreamEvent({ type: "text.delta", runId: "r1", text: "hi" })
  assert.deepEqual(event, { type: "text.delta", runId: "r1", text: "hi" })
})

test("未知 type 丢掉", () => {
  assert.equal(acceptStreamEvent({ type: "not.a.thing", runId: "r1" }), null)
})
