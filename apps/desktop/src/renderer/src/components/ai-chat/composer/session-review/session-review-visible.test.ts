import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewFilesKey, sessionReviewVisible } from "./session-review-visible.ts"

test("没写盘且没在跑就不出现", () => {
  assert.equal(sessionReviewVisible(0, false), false)
})

test("正在跑即使还没写盘也出现（计时 + 宠物）", () => {
  assert.equal(sessionReviewVisible(0, true), true)
})

test("有写盘 path 即使已停也出现", () => {
  assert.equal(sessionReviewVisible(2, false), true)
})

test("Keep/Undo 后同一批文件隐藏，新 run 再出现", () => {
  const key = reviewFilesKey(["b.ts", "a.ts"])
  assert.equal(key, reviewFilesKey(["a.ts", "b.ts"]))
  assert.equal(sessionReviewVisible(2, false, key, key), false)
  assert.equal(sessionReviewVisible(2, true, key, key), false)
  assert.equal(sessionReviewVisible(2, false, key, "c.ts"), true)
})

test("运行中 Keep 也按 dismissedKey 藏条；无文件时只靠 running", () => {
  const key = reviewFilesKey(["a.ts"])
  assert.equal(sessionReviewVisible(1, true, key, key), false)
  assert.equal(sessionReviewVisible(0, true), true)
  assert.equal(sessionReviewVisible(0, false), false)
})
