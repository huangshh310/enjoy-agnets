import assert from "node:assert/strict"
import { test } from "node:test"
import { isChatThreadPath, pathFromLocation, shouldClaimComposerFocus } from "./composer-focus.ts"

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
