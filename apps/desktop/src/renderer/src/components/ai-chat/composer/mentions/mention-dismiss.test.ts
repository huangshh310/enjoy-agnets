import assert from "node:assert/strict"
import { test } from "node:test"
import { detectActiveMention } from "./composer-token.ts"
import { dismissMentionValue } from "./mention-dismiss.ts"

test("Esc 关掉 @ 面板时连触发符一起去掉", () => {
  const value = "请看 @"
  const mention = detectActiveMention(value, value.length)
  assert.ok(mention)
  assert.equal(dismissMentionValue(value, mention), "请看 ")
})

test("查询中的 @foo 也会整段剥掉", () => {
  const value = "改 @foo"
  const mention = detectActiveMention(value, value.length)
  assert.ok(mention)
  assert.equal(dismissMentionValue(value, mention), "改 ")
})

test("没有激活提及时原文不动", () => {
  assert.equal(dismissMentionValue("普通句子", null), "普通句子")
})
