import assert from "node:assert/strict"
import { test } from "node:test"
import { canOpenAgentPicker, planComposerSwitch, sessionHasUserTurns } from "./plan-composer-switch.ts"

test("无用户轮直切，不进 handoff", () => {
  assert.deepEqual(
    planComposerSwitch({
      from: "claude",
      to: "cursor",
      hasUserTurns: false,
      hasPendingApproval: false
    }),
    { kind: "apply", to: "cursor" }
  )
  assert.equal(sessionHasUserTurns([{ role: "assistant", content: "hi" }]), false)
})

test("有用户轮必须 handoff，禁止静默换桥", () => {
  assert.deepEqual(
    planComposerSwitch({
      from: "claude",
      to: "cursor",
      hasUserTurns: true,
      hasPendingApproval: false
    }),
    { kind: "handoff", from: "claude", to: "cursor" }
  )
  assert.equal(sessionHasUserTurns([{ role: "user", content: "修登录" }]), true)
})

test("未决审批默认阻切", () => {
  assert.deepEqual(
    planComposerSwitch({
      from: "claude",
      to: "cursor",
      hasUserTurns: true,
      hasPendingApproval: true
    }),
    { kind: "blocked_by_approval", from: "claude", to: "cursor" }
  )
})

test("交接 pending 时不准再开 Picker", () => {
  assert.equal(canOpenAgentPicker("idle"), true)
  assert.equal(canOpenAgentPicker("handoff_pending"), false)
  assert.equal(canOpenAgentPicker("blocked_by_approval"), false)
  assert.equal(canOpenAgentPicker("disposing"), false)
})

test("同一引擎是 noop", () => {
  assert.equal(
    planComposerSwitch({
      from: "cursor",
      to: "cursor",
      hasUserTurns: true,
      hasPendingApproval: false
    }).kind,
    "noop"
  )
})
