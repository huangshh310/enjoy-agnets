/**
 * 计划卡片：标题、缺标题时的第一行、摘要最多四行。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { planCardFromText } from "./plan-card-text.ts"

test("有 markdown 标题时用标题", () => {
  const card = planCardFromText("# 改登录\n第一步\n第二步")
  assert.equal(card.title, "改登录")
  assert.deepEqual(card.preview, ["第一步", "第二步"])
})

test("没有标题时用第一行非空文字", () => {
  const card = planCardFromText("\n先看会话\n再改文件")
  assert.equal(card.title, "先看会话")
  assert.deepEqual(card.preview, ["再改文件"])
})

test("摘要最多四行，其余折叠", () => {
  const card = planCardFromText(["# 计划", "一", "二", "三", "四", "五", "六"].join("\n"))
  assert.deepEqual(card.preview, ["一", "二", "三", "四"])
  assert.equal(card.rest, "五\n六")
})
