import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeShortcutRows } from "./merge-shortcut-rows.ts"

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
