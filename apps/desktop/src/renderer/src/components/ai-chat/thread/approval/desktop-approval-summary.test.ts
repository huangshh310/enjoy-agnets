import assert from "node:assert/strict"
import { test } from "node:test"
import {
  desktopApprovalSummaryKey,
  desktopApprovalVerb,
  desktopApprovalVerbKey
} from "./desktop-approval-summary.ts"

test("click / type / 未知动作映射到人话键", () => {
  assert.equal(desktopApprovalVerb("click"), "click")
  assert.equal(desktopApprovalVerb("double_click"), "click")
  assert.equal(desktopApprovalVerb("type_text"), "type")
  assert.equal(desktopApprovalVerb("unknown"), "generic")
  assert.equal(desktopApprovalVerbKey("click"), "chat.desktopApprovalVerbClick")
  assert.equal(desktopApprovalVerbKey("generic"), "chat.desktopApprovalVerbGeneric")
})

test("有控件走带引号句，无控件走光杆句", () => {
  assert.equal(desktopApprovalSummaryKey("今日"), "chat.desktopApprovalSummary")
  assert.equal(desktopApprovalSummaryKey("  "), "chat.desktopApprovalSummaryBare")
})
