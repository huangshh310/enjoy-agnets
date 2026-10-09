import assert from "node:assert/strict"
import { test } from "node:test"
import { desktopApprovalSensitive, desktopApprovalView } from "./desktop-approval-args.ts"
import {
  defaultDesktopApprovalChoice,
  desktopApprovalChoiceIds,
  resolveDesktopApprovalChoice
} from "./desktop-approval-choice.ts"

const CALC = {
  observationId: "obs",
  action: "click",
  elementId: "e1",
  appName: "计算器",
  appKey: "com.apple.calculator",
  elementName: "7",
  sensitive: false
} as const

test("普通 allow 只有单缩略图，不是二次确认", () => {
  const view = desktopApprovalView({
    ...CALC,
    thumbnailPath: "/thumbs/only.png",
    thumbnailDataUrl: "data:image/png;base64,ONE"
  })
  assert.equal(view.secondConfirm, false)
  assert.equal(view.thumbnail, "data:image/png;base64,ONE")
  assert.equal(view.previousThumbnail, "")
  assert.equal(view.thumbsReady, true)
  assert.equal(view.canSessionAllow, true)
  assert.equal(view.canAlwaysAllow, true)
})

test("二次确认 args 暴露批准时与重拍后两张图", () => {
  const view = desktopApprovalView({
    ...CALC,
    observationId: "obs_new",
    needsSecondConfirm: true,
    previousThumbnailPath: "/thumbs/at-allow.png",
    thumbnailPath: "/thumbs/after-resnap.png",
    previousThumbnailDataUrl: "data:image/png;base64,OLD",
    thumbnailDataUrl: "data:image/png;base64,NEW"
  })
  assert.equal(view.secondConfirm, true)
  assert.equal(view.previousThumbnail, "data:image/png;base64,OLD")
  assert.equal(view.thumbnail, "data:image/png;base64,NEW")
  assert.equal(view.previousThumbnailPath, "/thumbs/at-allow.png")
  assert.equal(view.thumbnailPath, "/thumbs/after-resnap.png")
  assert.equal(view.thumbsReady, true)
  assert.equal(view.canSessionAllow, true)
  assert.equal(view.canAlwaysAllow, false)
})

test("二次确认缺任一缩略图则 thumbsReady 为假", () => {
  const view = desktopApprovalView({
    observationId: "obs_new",
    action: "click",
    needsSecondConfirm: true,
    previousThumbnailPath: "/thumbs/at-allow.png",
    thumbnailPath: "/thumbs/after-resnap.png",
    previousThumbnailDataUrl: "data:image/png;base64,OLD"
  })
  assert.equal(view.secondConfirm, true)
  assert.equal(view.thumbsReady, false)
  assert.equal(view.thumbnail, "")
})

test("有 appKey 且非 bypass 才能本会话允许此应用", () => {
  const ok = desktopApprovalView({
    ...CALC,
    appKeySource: "bundleId"
  })
  assert.equal(ok.canSessionAllow, true)
  assert.equal(ok.canAlwaysAllow, true)
  assert.equal(ok.bypassesSessionAllow, false)
  assert.match(ok.summary, /计算器/)
})

test("无 appKey、坐标或切前台时隐藏会话允许", () => {
  assert.equal(desktopApprovalView({ action: "click", elementId: "e1" }).canSessionAllow, false)
  assert.equal(desktopApprovalView({ action: "click", elementId: "e1" }).canAlwaysAllow, false)
  assert.equal(
    desktopApprovalView({
      action: "click",
      x: 12,
      y: 8,
      appKey: "com.apple.calculator",
      sensitive: false
    }).canSessionAllow,
    false
  )
  const coords = desktopApprovalView({
    action: "click",
    x: 12,
    y: 8,
    appKey: "com.apple.calculator",
    sensitive: false
  })
  assert.equal(coords.canAlwaysAllow, false)
  assert.equal(coords.strikeSessionAllow, true)
  assert.equal(coords.strikeAlwaysAllow, true)
  assert.equal(
    desktopApprovalView({
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator",
      bypassesSessionAllow: true,
      sensitive: false
    }).canSessionAllow,
    false
  )
})

test("敏感只信 main 下发的 sensitive，不按应用名自判", () => {
  const stampedSafe = desktopApprovalView({
    observationId: "obs",
    action: "click",
    elementId: "e1",
    appName: "系统设置",
    appKey: "com.apple.systempreferences",
    sensitive: false
  })
  assert.equal(stampedSafe.sensitive, false)
  assert.equal(stampedSafe.canSessionAllow, true)
  assert.equal(stampedSafe.canAlwaysAllow, true)
  assert.equal(defaultDesktopApprovalChoice(desktopApprovalChoiceIds(stampedSafe)), "allow_session")

  const flagged = desktopApprovalView({
    observationId: "obs",
    action: "click",
    elementId: "e1",
    appName: "系统设置",
    appKey: "com.apple.systempreferences",
    sensitive: true
  })
  assertSensitiveCard(flagged)
})

test("缺字段 / true 当敏感；只有严格 false 才默认本会话", () => {
  assert.equal(desktopApprovalSensitive(undefined), true)
  assert.equal(desktopApprovalSensitive(true), true)
  assert.equal(desktopApprovalSensitive("false"), true)
  assert.equal(desktopApprovalSensitive(0), true)
  assert.equal(desktopApprovalSensitive(false), false)

  const missing = desktopApprovalView({
    observationId: "obs",
    action: "click",
    elementId: "e1",
    appName: "计算器",
    appKey: "com.apple.calculator",
    elementName: "7"
  })
  assertSensitiveCard(missing)

  const truthy = desktopApprovalView({ ...CALC, sensitive: true })
  assertSensitiveCard(truthy)

  const ordinary = desktopApprovalView(CALC)
  assert.equal(ordinary.sensitive, false)
  assert.equal(ordinary.canSessionAllow, true)
  assert.equal(ordinary.canAlwaysAllow, true)
  assert.deepEqual(desktopApprovalChoiceIds(ordinary), ["allow", "allow_session", "allow_always", "deny"])
  assert.equal(defaultDesktopApprovalChoice(desktopApprovalChoiceIds(ordinary)), "allow_session")
})

function assertSensitiveCard(view: ReturnType<typeof desktopApprovalView>) {
  assert.equal(view.sensitive, true)
  assert.equal(view.canSessionAllow, false)
  assert.equal(view.canAlwaysAllow, false)
  assert.equal(view.strikeSessionAllow, false)
  assert.equal(view.strikeAlwaysAllow, false)
  assert.deepEqual(desktopApprovalChoiceIds(view), ["allow", "deny"])
  assert.equal(defaultDesktopApprovalChoice(desktopApprovalChoiceIds(view)), "allow")
}

test("pid 或无稳 appKey 时隐藏始终允许此应用", () => {
  assert.equal(desktopApprovalView({ action: "click", appKey: "18422" }).canAlwaysAllow, false)
  assert.equal(desktopApprovalView({ action: "click", appKey: "desktop_act:*" }).canAlwaysAllow, false)
  assert.equal(
    desktopApprovalView({
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator",
      sensitive: false
    }).canAlwaysAllow,
    true
  )
})

test("四选一：无稳键不出现 allow_always，隐藏项回落到 allow", () => {
  assert.deepEqual(desktopApprovalChoiceIds({ canSessionAllow: true, canAlwaysAllow: true }), [
    "allow",
    "allow_session",
    "allow_always",
    "deny"
  ])
  assert.deepEqual(desktopApprovalChoiceIds({ canSessionAllow: false, canAlwaysAllow: false }), [
    "allow",
    "deny"
  ])
  assert.equal(
    resolveDesktopApprovalChoice("allow_always", desktopApprovalChoiceIds({ canSessionAllow: false, canAlwaysAllow: false })),
    "allow"
  )
  assert.equal(
    defaultDesktopApprovalChoice(desktopApprovalChoiceIds({ canSessionAllow: true, canAlwaysAllow: true })),
    "allow_session"
  )
  assert.equal(
    defaultDesktopApprovalChoice(desktopApprovalChoiceIds({ canSessionAllow: false, canAlwaysAllow: false })),
    "allow"
  )
  assert.equal(
    defaultDesktopApprovalChoice(desktopApprovalChoiceIds({ canSessionAllow: false, canAlwaysAllow: true })),
    "allow"
  )
})
