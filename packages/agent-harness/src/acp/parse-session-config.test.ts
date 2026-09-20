import assert from "node:assert/strict"
import { test } from "node:test"
import { parseSessionConfigOptions } from "./parse-session-config.ts"

test("认 id 与 configId；分组 options 拍平", () => {
  const parsed = parseSessionConfigOptions({
    configOptions: [
      {
        configId: "reasoning_effort",
        name: "Effort",
        category: "thought_level",
        type: "select",
        currentValue: "high",
        options: [
          { group: "std", name: "Standard", options: [{ value: "low", name: "Low" }] },
          { value: "high", name: "High" }
        ]
      }
    ]
  })
  assert.equal(parsed[0]?.id, "reasoning_effort")
  assert.deepEqual(
    parsed[0]?.choices.map((item) => item.value),
    ["low", "high"]
  )
})
