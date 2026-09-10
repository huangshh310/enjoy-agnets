import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldFollowFileChanged } from "./follow-review-file.ts"

test("审查收起时不跟 file.changed", () => {
  assert.equal(
    shouldFollowFileChanged({ collapsed: true, activeTabKind: "review", reviewScope: "last-turn" }),
    false
  )
})

test("审查已开且上一轮作用域才跟文件", () => {
  assert.equal(
    shouldFollowFileChanged({
      collapsed: false,
      activeTabKind: "review",
      reviewScope: "last-turn"
    }),
    true
  )
})

test("作用域是未提交或当前不是审查标签则不跟", () => {
  assert.equal(
    shouldFollowFileChanged({
      collapsed: false,
      activeTabKind: "review",
      reviewScope: "uncommitted"
    }),
    false
  )
  assert.equal(
    shouldFollowFileChanged({
      collapsed: false,
      activeTabKind: "files",
      reviewScope: "last-turn"
    }),
    false
  )
})
