/**
 * 终端 ⌘F 作用域：查找条也算焦点，避免抢到本会话查找。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isTerminalFindHotkey, isTerminalKeyTarget } from "./terminal-focus.ts"

test("⌘/Ctrl+F 才是终端查找，带 Shift/Alt 不算", () => {
  assert.equal(isTerminalFindHotkey({ key: "f", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }), true)
  assert.equal(isTerminalFindHotkey({ key: "F", metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }), true)
  assert.equal(isTerminalFindHotkey({ key: "f", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), false)
  assert.equal(isTerminalFindHotkey({ key: "f", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }), false)
})

test("无节点不算终端焦点", () => {
  assert.equal(isTerminalKeyTarget(null), false)
})
