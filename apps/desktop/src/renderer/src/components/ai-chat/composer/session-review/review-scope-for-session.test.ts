import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewScopeForLastTurnCount } from "./review-scope-for-session.ts"

test("没有上一轮写盘 path 时审查走未提交", () => {
  assert.equal(reviewScopeForLastTurnCount(0), "uncommitted")
})

test("有上一轮写盘 path 时审查走上一轮", () => {
  assert.equal(reviewScopeForLastTurnCount(3), "last-turn")
})
