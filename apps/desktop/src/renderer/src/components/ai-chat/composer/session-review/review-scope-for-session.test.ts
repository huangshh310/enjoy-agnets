import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewScopeForLastTurnCount, reviewScopeForSession } from "./review-scope-for-session.ts"

test("没有上一轮写盘 path 时审查走未提交", () => {
  assert.equal(reviewScopeForLastTurnCount(0), "uncommitted")
})

test("有上一轮写盘 path 时审查走上一轮", () => {
  assert.equal(reviewScopeForLastTurnCount(3), "last-turn")
})

test("抽不出上一轮 path、工作区仍 dirty 时不要锁死空的上一轮", () => {
  assert.equal(reviewScopeForSession({ lastTurnCount: 0, dirtyCount: 4 }), "uncommitted")
})

test("有上一轮 path 时即使也有其它脏文件仍走上一轮", () => {
  assert.equal(reviewScopeForSession({ lastTurnCount: 2, dirtyCount: 9 }), "last-turn")
})
