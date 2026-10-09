import assert from "node:assert/strict"
import { test } from "node:test"
import { formatToolLabel } from "../tool-summary.ts"
import {
  desktopApprovalSummaryKey,
  desktopApprovalVerb,
  desktopApprovalVerbKey
} from "./desktop-approval-summary.ts"

const zh: Record<string, string> = {
  "chat.toolDesktop": "操作桌面",
  "chat.desktopApprovalVerbClick": "点击",
  "chat.desktopApprovalSummary": "在「{app}」里{action}「{control}」",
  "chat.desktopApprovalSummaryBare": "在「{app}」里{action}"
}

function t(key: string, vars?: Record<string, string | number>) {
  return (zh[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? ""))
}

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

test("线程工具名默认走人话，不露 desktop_act", () => {
  assert.equal(formatToolLabel("desktop_act", t, { action: "click", appName: "备忘录", elementName: "今日" }), "在「备忘录」里点击「今日」")
  assert.equal(formatToolLabel("desktop_list_apps", t), "操作桌面")
})
