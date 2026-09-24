/**
 * 快捷键表复用同一份定义，输入框里不拦截问号。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { canOpenShortcutSheet, groupShortcutDefs } from "./shortcut-sheet-logic.ts"

const defs = [
  { id: "g", category: "global" },
  { id: "v", category: "views" },
  { id: "c", category: "chat" }
]

test("分组不丢掉 id", () => {
  const groups = groupShortcutDefs(defs)
  assert.deepEqual(groups.global.map((item) => item.id), ["g"])
  assert.deepEqual(groups.views.map((item) => item.id), ["v"])
  assert.deepEqual(groups.chat.map((item) => item.id), ["c"])
})

test("可编辑焦点上不打开快捷键表", () => {
  assert.equal(canOpenShortcutSheet(null), true)
  assert.equal(canOpenShortcutSheet({ tagName: "INPUT" }), false)
  assert.equal(canOpenShortcutSheet({ tagName: "TEXTAREA" }), false)
  assert.equal(canOpenShortcutSheet({ tagName: "DIV", isContentEditable: true }), false)
  assert.equal(canOpenShortcutSheet({ tagName: "DIV" }), true)
  assert.equal(canOpenShortcutSheet({ tagName: "DIV" }, false), false)
})
