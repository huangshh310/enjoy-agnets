import assert from "node:assert/strict"
import { test } from "node:test"
import { usagePillTone } from "./usage-pill-tone.ts"

test("空会话额度条一律 quiet；有消息才走 ≥85% 警报", () => {
  assert.equal(usagePillTone(12, true), "quiet")
  assert.equal(usagePillTone(60, true), "quiet")
  assert.equal(usagePillTone(85, true), "quiet")
  assert.equal(usagePillTone(100, true), "quiet")
  assert.equal(usagePillTone(100, false), "alert")
  assert.equal(usagePillTone(85, false), "alert")
  assert.equal(usagePillTone(60, false), "mid")
  assert.equal(usagePillTone(12, false), "low")
})
