import assert from "node:assert/strict"
import { test } from "node:test"
import {
  focusComposerAfterNewSession,
  isChatThreadPath,
  pathFromLocation,
  queueComposerFocus,
  registerComposerFocus,
  shouldClaimComposerFocus
} from "./composer-focus.ts"

test("只有对话表面 #/ 才自动对焦", () => {
  assert.equal(isChatThreadPath("/"), true)
  assert.equal(isChatThreadPath(""), true)
  assert.equal(isChatThreadPath("/settings/general"), false)
  assert.equal(isChatThreadPath("/kanban"), false)
  assert.equal(pathFromLocation("#/", "/"), "/")
  assert.equal(pathFromLocation("#/settings/general", "/"), "/settings/general")
})

test("侧栏按钮上的焦点可以抢走，输入框 / 对话框不行", () => {
  assert.equal(shouldClaimComposerFocus({ pathname: "/" }), true)
  assert.equal(shouldClaimComposerFocus({ pathname: "/", activeIsComposer: true }), true)
  assert.equal(shouldClaimComposerFocus({ pathname: "/", activeIsTypingField: true }), false)
  assert.equal(shouldClaimComposerFocus({ pathname: "/", activeInDialog: true }), false)
  assert.equal(shouldClaimComposerFocus({ pathname: "/settings/general" }), false)
})

test("新对话回焦同步调用，已在输入框则不抢", () => {
  const calls: string[] = []
  const unregister = registerComposerFocus(() => {
    calls.push("focus")
  })
  focusComposerAfterNewSession()
  queueComposerFocus()
  assert.deepEqual(calls, ["focus"])
  unregister()
})
