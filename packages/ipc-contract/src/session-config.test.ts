import assert from "node:assert/strict"
import { test } from "node:test"
import { thoughtLevelOption, type SessionConfigOption } from "./session-config.ts"
import { thoughtSeedFor } from "./thought-seed.ts"

test("无 category 时认常见思考档 id", () => {
  const options: SessionConfigOption[] = [
    {
      id: "reasoning_effort",
      name: "Effort",
      choices: [
        { value: "low", name: "Low" },
        { value: "high", name: "High" }
      ]
    }
  ]
  assert.equal(thoughtLevelOption(options)?.id, "reasoning_effort")
})

test("thought_level 至少两档才露出", () => {
  const options: SessionConfigOption[] = [
    {
      id: "reasoning_effort",
      name: "Effort",
      category: "thought_level",
      choices: [
        { value: "low", name: "Low" },
        { value: "high", name: "High" }
      ],
      currentValue: "high"
    }
  ]
  assert.equal(thoughtLevelOption(options)?.id, "reasoning_effort")
  assert.equal(thoughtLevelOption([]), undefined)
  assert.equal(
    thoughtLevelOption([
      { id: "effort", name: "Effort", category: "thought_level", choices: [{ value: "high", name: "High" }] }
    ]),
    undefined
  )
})

test("Grok 4.6 种子含 xhigh，4.5 不含", () => {
  assert.deepEqual(
    thoughtSeedFor("grok", "grok-4.6")?.choices.map((item) => item.value),
    ["low", "medium", "high", "xhigh"]
  )
  assert.deepEqual(
    thoughtSeedFor("grok", "grok-4.5")?.choices.map((item) => item.value),
    ["low", "medium", "high"]
  )
  assert.equal(thoughtSeedFor("claude", "claude-haiku-4-5"), undefined)
  assert.equal(thoughtSeedFor("qwen"), undefined)
  assert.equal(thoughtSeedFor("codex")?.id, "reasoning_effort")
})
