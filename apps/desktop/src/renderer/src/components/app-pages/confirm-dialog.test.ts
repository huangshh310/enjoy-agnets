/**
 * 确认框必须铺满视口居中，禁止钉在侧栏上方。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./confirm-dialog.tsx", import.meta.url), "utf8")

test("ConfirmDialog 视口居中，带 testid", () => {
  assert.match(src, /data-testid="confirm-dialog"/)
  assert.match(src, /fixed inset-0/)
  assert.match(src, /top-1\/2 left-1\/2/)
  assert.match(src, /-translate-x-1\/2 -translate-y-1\/2/)
})
