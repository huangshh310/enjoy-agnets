import assert from "node:assert/strict"
import { test } from "node:test"
import { agentLoopTimeout, prepareAgentStep } from "./prepare-step.ts"

test("prepareAgentStep 裁掉超长历史", async () => {
  const messages = Array.from({ length: 50 }, (_, index) => ({
    role: index === 0 ? "system" : "user",
    content: `m${index}`
  })) as Array<{ role: "system" | "user"; content: string }>
  const prepared = await prepareAgentStep({ messages, stepNumber: 2 })
  assert.ok(prepared.messages.length < 50)
  assert.equal(prepared.messages[0]?.role, "system")
})

test("agentLoopTimeout 0 / 缺省不传对象", () => {
  assert.equal(agentLoopTimeout({}), undefined)
  assert.equal(agentLoopTimeout({ stepMs: 0, toolMs: 0 }), undefined)
  assert.deepEqual(agentLoopTimeout({ stepMs: 8_000, toolMs: 1_000 }), { stepMs: 8_000, toolMs: 1_000 })
})
