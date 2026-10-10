import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("会话行时间列固定宽、标题吃剩余并省略", () => {
  const row = readFileSync(join(dir, "sidebar-session-row.tsx"), "utf8")
  const constants = readFileSync(join(dir, "../../app-shell/constants.ts"), "utf8")
  const folder = readFileSync(join(dir, "sidebar-workspace-row.tsx"), "utf8")
  const organize = readFileSync(join(dir, "sidebar-organize-menu.tsx"), "utf8")
  assert.match(constants, /NAV_CARD_EXPANDED_PX = 280/)
  assert.match(constants, /SESSION_TIME_COL_CLASS/)
  assert.match(row, /SESSION_TIME_COL_CLASS/)
  assert.match(row, /min-w-0 flex-1 truncate/)
  assert.doesNotMatch(row, /w-8 shrink-0 text-right/)
  assert.doesNotMatch(folder, /bg-background-tertiary-default\/70/)
  assert.match(folder, /ml-2/)
  assert.match(organize, /align="start"/)
  assert.match(organize, /collisionPadding/)
})
