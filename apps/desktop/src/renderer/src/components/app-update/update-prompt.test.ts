/**
 * 更新芯片可见性。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { showsUpdateChip } from "./update-prompt.ts"

test("idle / dev / up-to-date 不画芯片", () => {
  assert.equal(showsUpdateChip("idle"), false)
  assert.equal(showsUpdateChip("dev"), false)
  assert.equal(showsUpdateChip("up-to-date"), false)
})

test("available / downloading / ready 画芯片", () => {
  assert.equal(showsUpdateChip("available"), true)
  assert.equal(showsUpdateChip("downloading"), true)
  assert.equal(showsUpdateChip("ready"), true)
})
