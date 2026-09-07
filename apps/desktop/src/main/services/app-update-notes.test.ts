/**
 * 更新百分比与发行说明整形。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { clampUpdatePercent, notesFromRelease } from "./app-update-notes.ts"

test("百分比夹在 0–100 并取整", () => {
  assert.equal(clampUpdatePercent(12.4), 12)
  assert.equal(clampUpdatePercent(-3), 0)
  assert.equal(clampUpdatePercent(140), 100)
  assert.equal(clampUpdatePercent(Number.NaN), 0)
})

test("发行说明支持字符串或 note 数组", () => {
  assert.equal(notesFromRelease("  feat: x  "), "feat: x")
  assert.equal(notesFromRelease([{ note: "a" }, { note: "b" }]), "a\n\nb")
  assert.equal(notesFromRelease(null), "")
})
