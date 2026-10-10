import assert from "node:assert/strict"
import { test } from "node:test"
import {
  REVIEW_FILE_NAME_MAX,
  clipReviewFileName,
  mergeReviewChangedFiles,
  reviewTurnWrote
} from "./session-review-persist.ts"

test("completedAt 只在本轮真写过文件时算写过", () => {
  assert.equal(reviewTurnWrote(undefined), false)
  assert.equal(reviewTurnWrote({ names: [], total: 0 }), false)
  assert.equal(reviewTurnWrote({ names: ["a.ts"], total: 1 }), true)
})

test("changedFiles 累加去重，total 累加，文件名封顶", () => {
  const merged = mergeReviewChangedFiles(
    { names: ["a.ts", "b.ts"], total: 2 },
    { names: ["b.ts", "c.ts"], total: 3 }
  )
  assert.deepEqual(merged, { names: ["a.ts", "b.ts", "c.ts"], total: 5 })
  const long = "n".repeat(REVIEW_FILE_NAME_MAX + 12)
  assert.equal(clipReviewFileName(long).length, REVIEW_FILE_NAME_MAX)
})
