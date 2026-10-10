import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { ARCHIVE_UNDO_TOAST_MS } from "./app-toast-policy.ts"
import { toastContentOffsetLeft } from "./toast-content-offset.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("内容区中线偏移 = 半栏宽 + 画布垫", () => {
  assert.equal(toastContentOffsetLeft(280, 12), 152)
  assert.equal(toastContentOffsetLeft(260, 12), 142)
  assert.equal(toastContentOffsetLeft(60, 12), 42)
})

test("归档撤销 toast 固定 5000ms，底边与高度锁在 Toaster", () => {
  assert.equal(ARCHIVE_UNDO_TOAST_MS, 5000)
  const toaster = readFileSync(join(dir, "../../../../../../packages/ui/components/ui/sonner.tsx"), "utf8")
  assert.match(toaster, /APP_TOAST_BOTTOM_OFFSET/)
  assert.match(toaster, /pauseOnHover/)
  assert.match(toaster, /min-h-10/)
  assert.match(toaster, /h-10/)
  const toast = readFileSync(join(dir, "../hooks/archive-session-toast.ts"), "utf8")
  assert.match(toast, /duration:\s*ARCHIVE_UNDO_TOAST_MS/)
})
