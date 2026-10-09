import assert from "node:assert/strict"
import test from "node:test"
import { desktopActIsSensitive, stampDesktopActSensitiveFlag } from "./desktop-act-app-key.ts"

test("系统设置 / 钥匙串 / 支付命中敏感，终端不命中", () => {
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "系统设置", appKey: "com.apple.systempreferences" }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "钥匙串访问" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Alipay" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "终端", appKey: "com.apple.Terminal" }), false)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "备忘录", appKey: "com.apple.notes" }), false)
})

test("stampDesktopActSensitiveFlag 把判定写进 args.sensitive", () => {
  const flagged = stampDesktopActSensitiveFlag({
    action: "click",
    appName: "系统设置",
    appKey: "com.apple.systempreferences"
  })
  assert.equal(flagged.sensitive, true)
  const ordinary = stampDesktopActSensitiveFlag({
    action: "click",
    appName: "备忘录",
    appKey: "com.apple.notes"
  })
  assert.equal(ordinary.sensitive, false)
})
