import assert from "node:assert/strict"
import { test } from "node:test"
import { agentLoopTimeout, mergeSteeringMessages, prepareAgentStep } from "./prepare-step.ts"

test("prepareAgentStep 裁掉超长历史", async () => {
  const messages = Array.from({ length: 50 }, (_, index) => ({
    role: index === 0 ? "system" : "user",
    content: `m${index}`
  })) as Array<{ role: "system" | "user"; content: string }>
  const prepared = await prepareAgentStep({ messages, stepNumber: 2 })
  assert.ok(prepared.messages.length < 50)
  assert.equal(prepared.messages[0]?.role, "system")
})

test("检查点先追加纠偏用户句再裁历史", async () => {
  const prepared = await prepareAgentStep({
    messages: [{ role: "user", content: "先做 A" }],
    stepNumber: 1,
    injectUserMessages: [{ role: "user", content: "改成先读文件" }]
  })
  assert.equal(prepared.messages.at(-1)?.content, "改成先读文件")
})

test("step 0 不注入纠偏，留给工具结束后的检查点", async () => {
  const prepared = await prepareAgentStep({
    messages: [{ role: "user", content: "先做 A" }],
    stepNumber: 0,
    injectUserMessages: [{ role: "user", content: "改成先读文件" }]
  })
  assert.equal(prepared.messages.at(-1)?.content, "先做 A")
})

test("尾部已是同一批纠偏句时不再重复追加", () => {
  const messages = [
    { role: "user" as const, content: "先做 A" },
    { role: "user" as const, content: "改成先读文件" }
  ]
  const injected = [{ role: "user" as const, content: "改成先读文件" }]
  const merged = mergeSteeringMessages(messages, injected)
  assert.equal(merged, messages)
  assert.equal(merged.length, 2)
})

test("agentLoopTimeout 0 / 缺省不传对象", () => {
  assert.equal(agentLoopTimeout({}), undefined)
  assert.equal(agentLoopTimeout({ stepMs: 0, toolMs: 0 }), undefined)
  assert.deepEqual(agentLoopTimeout({ stepMs: 8_000, toolMs: 1_000 }), { stepMs: 8_000, toolMs: 1_000 })
})
