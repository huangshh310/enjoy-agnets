/**
 * CU-P1-A：allow_always / 撤销各写各的，禁止 write-through 会话表。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("allow_always 只走 persist 簿，不调用会话 write-through", () => {
  const runner = readFileSync(new URL("./agent-runner.ts", import.meta.url), "utf8")
  assert.match(runner, /desktopActDecisionWrite/)
  assert.match(runner, /persistDesktopAlwaysAllowFromArgs/)
  assert.match(runner, /allow_always/)
  assert.match(runner, /applyDesktopActAllowDecision/)
  const persist = readFileSync(new URL("./desktop-always-allow-prefs.ts", import.meta.url), "utf8")
  assert.match(persist, /writePreferences\(\{ desktopAlwaysAllowAppKeys: next \}\)/)
  assert.doesNotMatch(persist, /writeThroughDesktopActSessionAllow/)
  assert.doesNotMatch(persist, /grantConversationDesktopAllow/)
  assert.doesNotMatch(persist, /clearConversationDesktopAllow/)
  assert.doesNotMatch(persist, /revokeConversationDesktopAllow/)
})

test("设置撤销只清 prefs 簿，不清会话表", () => {
  const state = readFileSync(new URL("./builtin-tools/builtin-tools-state.ts", import.meta.url), "utf8")
  assert.match(state, /revokeDesktopAlwaysAllowFromPrefs/)
  assert.match(state, /revokeAlwaysAllowApp/)
  assert.doesNotMatch(state, /revokeConversationDesktopAllow/)
  assert.doesNotMatch(state, /clearConversationDesktopAllow/)
  const ipc = readFileSync(new URL("../ipc-builtin-tools.ts", import.meta.url), "utf8")
  assert.match(ipc, /builtinTools.revokeAlwaysAllowApp/)
})
