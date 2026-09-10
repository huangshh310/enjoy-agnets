import assert from "node:assert/strict"
import { test } from "node:test"
import { formatExecutePlanInstructions } from "./execute-plan.ts"

test("没有正文时仍要求去读 implementation_plan.md", () => {
  const text = formatExecutePlanInstructions("")
  assert.ok(text.includes("implementation_plan.md"))
  assert.ok(text.includes("Approved implementation plan"))
})

test("有正文时放进 hidden 块，不要求用户气泡", () => {
  const text = formatExecutePlanInstructions("1. Split repo-outline\n2. Add tests")
  assert.ok(text.includes("Split repo-outline"))
  assert.ok(text.includes("Execute plan"))
})
