import assert from "node:assert/strict"
import { test } from "node:test"
import { clearSteer, drainSteer, enqueueSteer, peekSteerCount, steerToModelMessages } from "./steering-queue.ts"

test("纠偏按会话排队，drain 后清空", () => {
  clearSteer("sess_a")
  enqueueSteer("sess_a", { id: "1", text: "先停" })
  enqueueSteer("sess_a", { id: "2", text: "改读 README" })
  assert.equal(peekSteerCount("sess_a"), 2)
  const items = drainSteer("sess_a")
  assert.equal(items.length, 2)
  assert.equal(peekSteerCount("sess_a"), 0)
  assert.equal(steerToModelMessages(items)[1]?.content, "改读 README")
})
