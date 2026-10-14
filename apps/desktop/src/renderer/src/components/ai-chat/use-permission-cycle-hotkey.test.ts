/**
 * Shift+Tab：只在焦点就在空的 Composer 输入框时切审批档；写入成功才提示（luna / leo #154）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  composerInputEmpty,
  isComposerInputElement,
  permissionCycledMessage,
  runPermissionCycle,
  shouldCyclePermissionOnShiftTab
} from "./permission-cycle.ts"

const base = { composerFocus: true, composerEmpty: true, hasExtras: false, composing: false, terminalFocus: false }

test("焦点在空输入框切档；有字让出", () => {
  assert.equal(shouldCyclePermissionOnShiftTab(base), true)
  assert.equal(shouldCyclePermissionOnShiftTab({ ...base, composerEmpty: false }), false)
})

test("焦点不在输入框本身（附件 / Chip / 模型 / 盾牌按钮、浮层、弹窗）不切（leo B2）", () => {
  assert.equal(shouldCyclePermissionOnShiftTab({ ...base, composerFocus: false }), false)
  assert.equal(isComposerInputElement({ getAttribute: () => "composer-input" }), true)
  assert.equal(isComposerInputElement({ getAttribute: () => "composer-attach" }), false)
  assert.equal(isComposerInputElement({ getAttribute: () => null }), false)
  assert.equal(isComposerInputElement(null), false)
})

test("只有附件或 Chip 的草稿不算空（leo B2）", () => {
  assert.equal(shouldCyclePermissionOnShiftTab({ ...base, hasExtras: true }), false)
})

test("输入法组字中不切（leo S1）；终端不切", () => {
  assert.equal(shouldCyclePermissionOnShiftTab({ ...base, composing: true }), false)
  assert.equal(shouldCyclePermissionOnShiftTab({ ...base, terminalFocus: true }), false)
})

test("composerInputEmpty 认 textarea value，否则回落 store", () => {
  assert.equal(composerInputEmpty({ querySelector: () => ({ value: "  hello " }) }), false)
  assert.equal(composerInputEmpty({ querySelector: () => ({ value: "   " }) }), true)
  assert.equal(composerInputEmpty({ querySelector: () => null }, "draft"), false)
  assert.equal(composerInputEmpty({ querySelector: () => null }, "  "), true)
})

test("切档后提示文案带新档名", () => {
  const t = (k: string, v?: Record<string, string>) => (v ? `${k}:${v.mode}` : k)
  assert.equal(permissionCycledMessage("allow-edits", t), "chat.permissionCycled:chat.approvalEdits")
  assert.equal(permissionCycledMessage("allow-reads", t), "chat.permissionCycled:chat.approvalReads")
})

test("写入成功后才提示已切；失败提示没切成、不抛未处理拒绝（leo B1）", async () => {
  const calls: string[] = []
  let resolve!: () => void
  const pending = runPermissionCycle(
    () => new Promise<void>((r) => (resolve = r)),
    { ok: () => calls.push("ok"), failed: () => calls.push("failed") }
  )
  assert.deepEqual(calls, [])
  resolve()
  assert.equal(await pending, "ok")
  assert.deepEqual(calls, ["ok"])

  const failed: string[] = []
  const result = await runPermissionCycle(
    () => Promise.reject(new Error("disk full")),
    { ok: () => failed.push("ok"), failed: () => failed.push("failed") }
  )
  assert.equal(result, "failed")
  assert.deepEqual(failed, ["failed"])
})
