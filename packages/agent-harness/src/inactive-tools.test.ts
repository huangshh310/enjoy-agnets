import assert from "node:assert/strict"
import { test } from "node:test"
import { inactiveToolsForMode } from "./inactive-tools.ts"

test("Agent / Debug 不禁用内置突变工具", () => {
  assert.equal(inactiveToolsForMode("agent"), undefined)
  assert.equal(inactiveToolsForMode("debug"), undefined)
})

test("Ask / Plan 禁用写、改、bash", () => {
  const ask = inactiveToolsForMode("ask")
  assert.ok(ask?.includes("write"))
  assert.ok(ask?.includes("edit"))
  assert.ok(ask?.includes("bash"))
  assert.ok(!ask?.includes("write_file"))
  const plan = inactiveToolsForMode("plan")
  assert.deepEqual(plan, ask)
})
