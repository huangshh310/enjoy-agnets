import assert from "node:assert/strict"
import { test } from "node:test"
import { shortcutRowMatches } from "./filter-shortcut-rows.ts"
import { mergeShortcutRows } from "./merge-shortcut-rows.ts"

test("有关键字只留命中行", () => {
  assert.equal(shortcutRowMatches("快速搜索 mod+l", "搜索"), true)
  assert.equal(shortcutRowMatches("打开设置 mod+,", "搜索"), false)
  assert.equal(shortcutRowMatches("打开设置 mod+,", "   "), true)
})

test("面板把 ⌘L 与 ⌘K 收成一行", () => {
  const rows = mergeShortcutRows([
    { command: "search.quick", key: "mod+l" },
    { command: "search.quick", key: "mod+k" },
    { command: "settings.open", key: "mod+," }
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0]?.keys, ["mod+l", "mod+k"])
  assert.equal(rows[1]?.command, "settings.open")
})
