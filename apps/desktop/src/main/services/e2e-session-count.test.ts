import assert from "node:assert/strict"
import { test } from "node:test"
import { e2eSessionCount } from "./e2e-session-count.ts"

test("未设置时只种 1 个会话", () => {
  assert.equal(e2eSessionCount(undefined), 1)
  assert.equal(e2eSessionCount(""), 1)
  assert.equal(e2eSessionCount("nope"), 1)
})

test("侧栏灌满用 30，上限 80", () => {
  assert.equal(e2eSessionCount("30"), 30)
  assert.equal(e2eSessionCount("80"), 80)
  assert.equal(e2eSessionCount("999"), 80)
  assert.equal(e2eSessionCount("0"), 1)
})
