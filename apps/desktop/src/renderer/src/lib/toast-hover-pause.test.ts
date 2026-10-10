/**
 * sonner 2 没有 pauseOnHover 入参：ol mouseenter 把 expanded 置真才停表。
 * 我们的 unstyled 皮必须让 ol / toast 都能接到指针，否则 8s 仍会自熄。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

function read(rel: string): string {
  return readFileSync(join(dir, rel), "utf8")
}

test("Toaster 与单条 toast 都能接到悬停，暂停走 sonner expanded", () => {
  const toaster = read("../../../../../../packages/ui/components/ui/sonner.tsx")
  assert.match(toaster, /className="pointer-events-auto"/)
  assert.match(toaster, /"pointer-events-auto flex h-10 min-h-10/)
  assert.match(toaster, /ol mouseenter/)
  assert.equal(toaster.includes("pointer-events-none"), false)
  const app = read("../components/layout/app-toaster.tsx")
  assert.match(app, /useToastBottomOffset/)
  assert.match(app, /offsetBottom/)
})
