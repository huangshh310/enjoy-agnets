/**
 * 默认快捷键契约：chat.permission.cycle 不绑定 shift+tab（#173）。
 * 命令仍在目录里，用户可在设置自行绑定。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_KEYBINDINGS, KEYBINDING_COMMANDS } from "./keybindings.ts"

test("KEYBINDING_COMMANDS 仍包含 chat.permission.cycle", () => {
  assert.ok((KEYBINDING_COMMANDS as readonly string[]).includes("chat.permission.cycle"))
})

test("DEFAULT_KEYBINDINGS 不含 shift+tab → chat.permission.cycle", () => {
  const cycle = DEFAULT_KEYBINDINGS.filter((rule) => rule.command === "chat.permission.cycle")
  assert.equal(cycle.length, 0)
  assert.equal(
    DEFAULT_KEYBINDINGS.some((rule) => rule.key === "shift+tab" && rule.command === "chat.permission.cycle"),
    false
  )
  assert.equal(DEFAULT_KEYBINDINGS.some((rule) => rule.key === "shift+tab"), false)
})
