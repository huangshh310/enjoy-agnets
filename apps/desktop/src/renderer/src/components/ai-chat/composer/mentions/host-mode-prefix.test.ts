import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyHostModePrefix,
  extractHostModeFence,
  hostModePrefix,
  stripHostModePrefix
} from "./host-mode-prefix.ts"

test("agent 不垫围栏；plan 是宿主命令不是引用块", () => {
  assert.equal(hostModePrefix("agent"), "")
  const plan = hostModePrefix("plan")
  assert.match(plan, /\[Enjoy host mode: plan\]/)
  assert.match(plan, /plan mode/)
  assert.equal(plan.includes("引用自"), false)
})

test("非 ACP 不垫；ACP 每轮垫围栏且不叠", () => {
  assert.equal(applyHostModePrefix(false, "plan", "先画蓝图"), "先画蓝图")
  const grok = applyHostModePrefix(true, "plan", "当前是什么模式")
  assert.match(grok, /\[Enjoy host mode: plan\]/)
  assert.match(grok, /当前是什么模式/)
  assert.equal(applyHostModePrefix(true, "agent", "继续"), "继续")
  assert.equal(applyHostModePrefix(true, "plan", grok), grok)
})

test("气泡剥掉围栏，编辑时还能取回", () => {
  const raw = applyHostModePrefix(true, "plan", "当前是什么模式")
  assert.equal(stripHostModePrefix(raw), "当前是什么模式")
  assert.match(extractHostModeFence(raw), /host mode: plan/)
})
