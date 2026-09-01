/**
 * Workflow chain 语法：用 > 或逗号切开，后一步依赖前一步。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { stepsFromChain } from "./steps-from-chain.ts"

test("stepsFromChain 按 > 切步骤并串依赖", () => {
  const steps = stepsFromChain("plan>act>verify")
  assert.equal(steps.length, 3)
  assert.equal(steps[0]?.id, "plan")
  assert.deepEqual(steps[0]?.dependsOn, [])
  assert.deepEqual(steps[1]?.dependsOn, ["plan"])
  assert.deepEqual(steps[2]?.dependsOn, ["act"])
})

test("stepsFromChain 忽略空段", () => {
  assert.equal(stepsFromChain("  plan >  > act ").length, 2)
  assert.equal(stepsFromChain("").length, 0)
})
