/**
 * 设置侧栏：原生滚动，不要 Radix ScrollArea（viewport table 会裁掉末组）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("情境栏列表走 overflow-y-auto，父级可收缩", () => {
  const nav = readFileSync(join(dir, "module-nav.tsx"), "utf8")
  assert.match(nav, /data-testid="module-nav-scroll"/)
  assert.match(nav, /overflow-y-auto/)
  assert.doesNotMatch(nav, /ScrollArea/)
  const column = readFileSync(join(dir, "context-column.tsx"), "utf8")
  assert.match(column, /overflow-hidden/)
  assert.match(column, /flex min-h-0 flex-1 flex-col/)
})
