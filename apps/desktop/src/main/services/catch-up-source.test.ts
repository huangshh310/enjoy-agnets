import assert from "node:assert/strict"
import { test } from "node:test"
import { catchUpSourceOf } from "./catch-up-source.ts"

test("只认 isCatchUp 且带 automationId 的来源", () => {
  assert.equal(catchUpSourceOf(undefined), undefined)
  assert.equal(catchUpSourceOf({ isCatchUp: false, automationId: "auto_1" }), undefined)
  assert.equal(catchUpSourceOf({ isCatchUp: true }), undefined)
  assert.deepEqual(catchUpSourceOf({ isCatchUp: true, automationId: "auto_1", scheduledAt: 42 }), {
    automationId: "auto_1",
    scheduledAt: 42,
    isCatchUp: true
  })
})
