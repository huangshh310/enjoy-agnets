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

test("焦点不在 Composer 一律不切档（浮层 / 弹窗 / 菜单 / 其它输入框 / 终端；luna #154）", () => {
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
    false
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

test("切档后给可见提示：toast 文案带新档名", async () => {
  const { permissionCycledMessage } = await import("./permission-cycle.ts")
  const t = (k: string, v?: Record<string, string>) => (v ? `${k}:${v.mode}` : k)
  assert.equal(permissionCycledMessage("allow-edits", t), "chat.permissionCycled:chat.approvalEdits")
  assert.equal(permissionCycledMessage("allow-reads", t), "chat.permissionCycled:chat.approvalReads")
})
