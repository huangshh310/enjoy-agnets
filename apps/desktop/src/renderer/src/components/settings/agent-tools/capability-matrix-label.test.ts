import assert from "node:assert/strict"
import { test } from "node:test"
import { matrixRuntimeLabel } from "./capability-matrix-label.ts"

test("自定义行优先用户 label，不画 raw id", () => {
  assert.equal(matrixRuntimeLabel("custom:my-lab-agent", "实验室 Agent"), "实验室 Agent")
  assert.equal(matrixRuntimeLabel("custom:opencode", "  OpenCode Lab  "), "OpenCode Lab")
})

test("自定义行没有 label 才回落 slug", () => {
  assert.equal(matrixRuntimeLabel("custom:my-lab-agent"), "my-lab-agent")
  assert.equal(matrixRuntimeLabel("custom:my-lab-agent", "   "), "my-lab-agent")
})

test("内置行仍走固定显示名", () => {
  assert.equal(matrixRuntimeLabel("cursor"), "Cursor CLI")
  assert.equal(matrixRuntimeLabel("enjoy-local"), "Enjoy 本地")
  assert.equal(matrixRuntimeLabel("droid"), "Factory Droid")
  assert.equal(matrixRuntimeLabel("devin"), "Devin CLI")
})
