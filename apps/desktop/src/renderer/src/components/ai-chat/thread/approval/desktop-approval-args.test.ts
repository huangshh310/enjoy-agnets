import assert from "node:assert/strict"
import { test } from "node:test"
import { desktopApprovalView } from "./desktop-approval-args.ts"

test("有 appKey 且非 bypass 才能本会话允许此应用", () => {
  const ok = desktopApprovalView({
    observationId: "obs",
    action: "click",
    elementId: "e1",
    appName: "计算器",
    appKey: "com.apple.calculator",
    appKeySource: "bundleId",
    elementName: "7"
  })
  assert.equal(ok.canSessionAllow, true)
  assert.equal(ok.bypassesSessionAllow, false)
  assert.match(ok.summary, /计算器/)
})

test("无 appKey、坐标或切前台时隐藏会话允许", () => {
  assert.equal(desktopApprovalView({ action: "click", elementId: "e1" }).canSessionAllow, false)
  assert.equal(
    desktopApprovalView({
      action: "click",
      x: 12,
      y: 8,
      appKey: "com.apple.calculator"
    }).canSessionAllow,
    false
  )
  assert.equal(
    desktopApprovalView({
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator",
      bypassesSessionAllow: true
    }).canSessionAllow,
    false
  )
})
