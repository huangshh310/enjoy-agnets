import assert from "node:assert/strict"
import { test } from "node:test"
import { sameReviewPath } from "./same-review-path.ts"

test("同路径或后缀目录对齐", () => {
  assert.equal(sameReviewPath("src/app/page.tsx", "src/app/page.tsx"), true)
  assert.equal(sameReviewPath("page.tsx", "src/app/page.tsx"), true)
  assert.equal(sameReviewPath("src/app/page.tsx", "page.tsx"), true)
  assert.equal(sameReviewPath("a.ts", "b.ts"), false)
})
