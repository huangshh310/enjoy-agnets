import assert from "node:assert/strict"
import { test } from "node:test"
import {
  reviewFilesKey,
  sessionReviewVisible,
  shouldExpandReviewFiles
} from "./session-review-visible.ts"

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

test("空会话即使有脏文件也不出审查条", () => {
  assert.equal(sessionReviewVisible(22, false, undefined, undefined, 0), false)
  assert.equal(sessionReviewVisible(0, true, undefined, undefined, 0), false)
})

test("工作区脏文件默认折叠；本轮 2–6 个文件才展开", () => {
  assert.equal(shouldExpandReviewFiles(false, 22), false)
  assert.equal(shouldExpandReviewFiles(true, 1), false)
  assert.equal(shouldExpandReviewFiles(true, 3), true)
  assert.equal(shouldExpandReviewFiles(true, 7), false)
})
