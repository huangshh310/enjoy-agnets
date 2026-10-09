import assert from "node:assert/strict"
import { test } from "node:test"
import { formatTimezoneLabel, isBeijingTimezone } from "./timezone-label.ts"

test("上海时区写成北京时间", () => {
  assert.equal(isBeijingTimezone("Asia/Shanghai"), true)
  assert.equal(formatTimezoneLabel("Asia/Shanghai", "zh"), "北京时间")
  assert.equal(formatTimezoneLabel("Asia/Shanghai", "en"), "Beijing time")
})

test("其它时区用人话，不摊 IANA 下划线", () => {
  assert.equal(isBeijingTimezone("America/New_York"), false)
  const en = formatTimezoneLabel("America/New_York", "en")
  assert.notEqual(en, "America/New_York")
  assert.doesNotMatch(en, /_/)
  const zh = formatTimezoneLabel("America/New_York", "zh")
  assert.notEqual(zh, "America/New_York")
})

test("非法时区回落原文", () => {
  assert.equal(formatTimezoneLabel("Not/A_Zone", "zh"), "Not/A Zone")
})
