import assert from "node:assert/strict"
import { test } from "node:test"
import { joinSegments } from "./join-segments.ts"

test("跳过空段，不留下双点或首尾点", () => {
  assert.equal(joinSegments("每天 08:00", "北京时间"), "每天 08:00 · 北京时间")
  assert.equal(joinSegments("每天 08:00", "", "北京时间"), "每天 08:00 · 北京时间")
  assert.equal(joinSegments("", "北京时间"), "北京时间")
  assert.equal(joinSegments("每天 08:00", "  ", null, undefined), "每天 08:00")
  assert.equal(joinSegments(null, "  ", undefined), "")
  assert.equal(joinSegments("  引擎  ", "模型"), "引擎 · 模型")
})
