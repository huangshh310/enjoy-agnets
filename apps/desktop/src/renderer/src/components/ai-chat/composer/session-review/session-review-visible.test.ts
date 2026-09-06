import assert from "node:assert/strict"
import { test } from "node:test"
import { sessionReviewVisible } from "./session-review-visible.ts"

test("没写盘且没在跑就不出现", () => {
  assert.equal(sessionReviewVisible(0, false), false)
})

test("正在跑即使还没写盘也出现（计时 + 宠物）", () => {
  assert.equal(sessionReviewVisible(0, true), true)
})

test("有写盘 path 即使已停也出现", () => {
  assert.equal(sessionReviewVisible(2, false), true)
})
