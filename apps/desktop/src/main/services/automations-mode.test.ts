import assert from "node:assert/strict"
import { test } from "node:test"
import { applyAutomationHostMode, resolveAutomationMode } from "./automations-mode.ts"

test("探索写入 plan，其余执行", () => {
  assert.equal(resolveAutomationMode("plan"), "plan")
  assert.equal(resolveAutomationMode("ask"), "plan")
  assert.equal(resolveAutomationMode("agent"), "agent")
  assert.equal(resolveAutomationMode(undefined), "agent")
})

test("ACP 探索才垫围栏，Enjoy Local 原文开流", () => {
  const prompt = "跑一遍类型检查"
  assert.equal(applyAutomationHostMode(false, "plan", prompt), prompt)
  assert.equal(applyAutomationHostMode(true, "agent", prompt), prompt)
  const fenced = applyAutomationHostMode(true, "plan", prompt)
  assert.match(fenced, /\[Enjoy host mode: plan\]/)
  assert.match(fenced, /跑一遍类型检查/)
})
