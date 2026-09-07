import assert from "node:assert/strict"
import { test } from "node:test"
import type { ModelMessage } from "ai"
import { absorbSteering, absorbSteeringMessages } from "./absorb-steering.ts"
import { clearSteer, enqueueSteer, peekSteerCount } from "./steering-queue.ts"

function runWith(sessionId: string, messages: ModelMessage[] = []) {
  return { messages, input: { sessionId } }
}

test("drain 纠偏句接到 run.messages，队列清空", () => {
  clearSteer("sess_abs")
  enqueueSteer("sess_abs", { id: "1", text: "先读 README" })
  const run = runWith("sess_abs", [{ role: "user", content: "做完登录" }])
  const extra = absorbSteeringMessages(run)
  assert.equal(extra.length, 1)
  assert.equal(run.messages.at(-1)?.content, "先读 README")
  assert.equal(peekSteerCount("sess_abs"), 0)
})

test("空队列不改 messages", () => {
  clearSteer("sess_empty")
  const run = runWith("sess_empty", [{ role: "user", content: "A" }])
  assert.equal(absorbSteering(run), false)
  assert.equal(run.messages.length, 1)
})
