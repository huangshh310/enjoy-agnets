/**
 * Shift+Tab：空 Composer 切审批档；有字让出焦点。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { composerInputEmpty, shouldCyclePermissionOnShiftTab } from "./permission-cycle.ts"

test("空输入 Shift+Tab 切档，有字则让出焦点", () => {
  assert.equal(
    shouldCyclePermissionOnShiftTab({
      composerEmpty: true,
      composerFocus: true,
      inputFocus: true,
      terminalFocus: false
    }),
    true
  )
  assert.equal(
    shouldCyclePermissionOnShiftTab({
      composerEmpty: false,
      composerFocus: true,
      inputFocus: true,
      terminalFocus: false
    }),
    false
  )
})

test("焦点在其它输入框不切档，框外仍切", () => {
  assert.equal(
    shouldCyclePermissionOnShiftTab({
      composerEmpty: true,
      composerFocus: false,
      inputFocus: true,
      terminalFocus: false
    }),
    false
  )
  assert.equal(
    shouldCyclePermissionOnShiftTab({
      composerEmpty: true,
      composerFocus: false,
      inputFocus: false,
      terminalFocus: false
    }),
    true
  )
  assert.equal(
    shouldCyclePermissionOnShiftTab({
      composerEmpty: true,
      composerFocus: false,
      inputFocus: false,
      terminalFocus: true
    }),
    false
  )
})

test("composerInputEmpty 认 textarea value，否则回落 store", () => {
  assert.equal(composerInputEmpty({ querySelector: () => ({ value: "  hello " }) }), false)
  assert.equal(composerInputEmpty({ querySelector: () => ({ value: "   " }) }), true)
  assert.equal(composerInputEmpty({ querySelector: () => null }, "draft"), false)
  assert.equal(composerInputEmpty({ querySelector: () => null }, "  "), true)
})
