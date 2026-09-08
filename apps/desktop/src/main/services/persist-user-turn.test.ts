import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldSkipDuplicateUserTurn } from "./persist-user-turn-dedupe.ts"

test("8 秒内相同用户句不重复落库", () => {
  assert.equal(
    shouldSkipDuplicateUserTurn({ content: "hi", createdAt: 1000 }, "hi", 2000),
    true
  )
  assert.equal(
    shouldSkipDuplicateUserTurn({ content: "hi", createdAt: 1000 }, "hi", 10_000),
    false
  )
  assert.equal(
    shouldSkipDuplicateUserTurn({ content: "hi", createdAt: 1000 }, "other", 2000),
    false
  )
  assert.equal(shouldSkipDuplicateUserTurn(undefined, "hi", 2000), false)
})
