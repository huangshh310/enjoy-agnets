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

test("待验收闸在停泵后仍出现，即使改动条已 Keep", () => {
  const key = reviewFilesKey(["a.ts"])
  assert.equal(sessionReviewVisible(1, false, key, key, 2, true), true)
  assert.equal(sessionReviewVisible(0, false, undefined, undefined, 2, true), true)
  assert.equal(sessionReviewVisible(0, true, undefined, undefined, 2, true), true)
})

test("工作区脏文件默认折叠；本轮 2–6 个文件才展开", () => {
  assert.equal(shouldExpandReviewFiles(false, 22), false)
  assert.equal(shouldExpandReviewFiles(true, 1), false)
  assert.equal(shouldExpandReviewFiles(true, 3), true)
  assert.equal(shouldExpandReviewFiles(true, 7), false)
})

test("jojo P2：Dock「通过」后（库里 done）重启——内存收起丢了也不再冒改动条；再跑起来照常显示", () => {
  // 重启后 dismissedKey 为空，本轮写过的文件仍 dirty。
  assert.equal(sessionReviewVisible(1, false, null, "a.txt", 4, false, true), false)
  assert.equal(sessionReviewVisible(1, true, null, "a.txt", 4, false, true), true)
  assert.equal(sessionReviewVisible(1, false, null, "a.txt", 4, false, false), true)
})

test("接线：改动条按库里 workflow=done 传 approved", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./use-session-review-model.ts", import.meta.url), "utf8")
  assert.match(src, /const approved = workflowStatus === "done"/)
  assert.match(src, /needsReview,\s*approved\s*\)/)
})
