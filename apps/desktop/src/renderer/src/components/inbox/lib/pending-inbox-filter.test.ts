import assert from "node:assert/strict"
import { test } from "node:test"
import { requestInboxFilter, takeInboxFilter } from "./pending-inbox-filter.ts"

test("失败筛只消费一次", () => {
  requestInboxFilter("failed")
  assert.equal(takeInboxFilter(), "failed")
  assert.equal(takeInboxFilter(), undefined)
})
