import assert from "node:assert/strict"
import { test } from "node:test"
import {
  normalizeDesktopAlwaysAllowEntries,
  removeDesktopAlwaysAllowEntry,
  upsertDesktopAlwaysAllowEntry
} from "./desktop-always-allow-ledger.ts"

test("稳 appKey 写入簿，重复键覆盖显示名", () => {
  const first = upsertDesktopAlwaysAllowEntry([], {
    appKey: "com.apple.calculator",
    displayName: "计算器"
  })
  assert.deepEqual(first, [{ appKey: "com.apple.calculator", displayName: "计算器" }])
  const next = upsertDesktopAlwaysAllowEntry(first ?? [], {
    appKey: "com.apple.calculator",
    displayName: "Calculator"
  })
  assert.deepEqual(next, [{ appKey: "com.apple.calculator", displayName: "Calculator" }])
})

test("禁止把 desktop_act:* / 裸 desktop_act / pid 写入簿", () => {
  assert.equal(upsertDesktopAlwaysAllowEntry([], { appKey: "desktop_act:*" }), null)
  assert.equal(upsertDesktopAlwaysAllowEntry([], { appKey: "desktop_act" }), null)
  assert.equal(upsertDesktopAlwaysAllowEntry([], { appKey: "desktop_act:com.apple.notes" }), null)
  assert.equal(upsertDesktopAlwaysAllowEntry([], { appKey: "18422" }), null)
  assert.equal(upsertDesktopAlwaysAllowEntry([], { appKey: "" }), null)
})

test("撤销只删该键，不影响其它条目", () => {
  const rows = [
    { appKey: "com.apple.calculator", displayName: "计算器" },
    { appKey: "com.apple.Notes", displayName: "Notes" }
  ]
  assert.deepEqual(removeDesktopAlwaysAllowEntry(rows, "com.apple.calculator"), [
    { appKey: "com.apple.Notes", displayName: "Notes" }
  ])
})

test("读簿时丢掉非法键，兼容旧 string[]", () => {
  const rows = normalizeDesktopAlwaysAllowEntries([
    "com.apple.Safari",
    "desktop_act:*",
    "18422",
    { appKey: "com.apple.Notes", displayName: "Notes" },
    { appKey: "com.apple.Safari", displayName: "dup" }
  ])
  assert.deepEqual(rows, [
    { appKey: "com.apple.Safari", displayName: "com.apple.Safari" },
    { appKey: "com.apple.Notes", displayName: "Notes" }
  ])
})
