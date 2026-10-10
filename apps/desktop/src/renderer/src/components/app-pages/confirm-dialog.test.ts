/**
 * 确认框必须铺满视口 flex 居中。zoom 动画会抹掉 translate，禁止再靠 top/left 50% + translate。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./confirm-dialog.tsx", import.meta.url), "utf8")

test("ConfirmDialog 视口居中，带 testid", () => {
  assert.match(src, /data-testid="confirm-dialog"/)
  assert.match(src, /data-testid="confirm-dialog-panel"/)
  assert.match(src, /fixed inset-0/)
  assert.match(src, /flex h-full w-full max-w-none/)
  assert.match(src, /items-center justify-center/)
  assert.match(src, /translate-x-0 translate-y-0/)
  assert.match(src, /transform:\s*"none"/)
  assert.match(src, /display:\s*"flex"/)
  assert.doesNotMatch(src, /top-1\/2 left-1\/2/)
  assert.doesNotMatch(src, /-translate-x-1\/2 -translate-y-1\/2/)
})
