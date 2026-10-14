import assert from "node:assert/strict"
import { test } from "node:test"
import {
  REVIEW_FILE_NAME_MAX,
  clipReviewFileName,
  mergeReviewChangedFiles,
  reviewFilesToCarry,
  reviewTurnWrote
} from "./session-review-persist.ts"

test("completedAt 只在本轮真写过文件时算写过", () => {
  assert.equal(reviewTurnWrote(undefined), false)
  assert.equal(reviewTurnWrote({ names: [], total: 0 }), false)
  assert.equal(reviewTurnWrote({ names: ["a.ts"], total: 1 }), true)
})

test("同一路径写两次 total 是 1，不是累加", () => {
  const merged = mergeReviewChangedFiles({ names: ["a.ts"], total: 1 }, { names: ["a.ts"], total: 1 })
  assert.deepEqual(merged, { names: ["a.ts"], total: 1 })
})

test("仍待验收时跨轮去重；通过后再写从空开始", () => {
  const stillOpen = mergeReviewChangedFiles(
    reviewFilesToCarry("needs_review", { names: ["a.ts", "b.ts"], total: 2 }),
    { names: ["b.ts", "c.ts"], total: 2 }
  )
  assert.deepEqual(stillOpen, { names: ["a.ts", "b.ts", "c.ts"], total: 3 })
  const afterPass = mergeReviewChangedFiles(
    reviewFilesToCarry("done", { names: ["a.ts"], total: 1 }),
    { names: ["b.ts"], total: 1 }
  )
  assert.deepEqual(afterPass, { names: ["b.ts"], total: 1 })
  assert.equal(reviewFilesToCarry("todo", { names: ["a.ts"], total: 1 }), undefined)
})

test("文件名封顶，展示最多 3 个，total 认去重集合", () => {
  const long = "n".repeat(REVIEW_FILE_NAME_MAX + 12)
  assert.equal(clipReviewFileName(long).length, REVIEW_FILE_NAME_MAX)
  const many = mergeReviewChangedFiles(
    { names: ["a.ts", "b.ts", "c.ts"], total: 3 },
    { names: ["d.ts"], total: 1 }
  )
  assert.deepEqual(many, { names: ["a.ts", "b.ts", "c.ts"], total: 4 })
})
