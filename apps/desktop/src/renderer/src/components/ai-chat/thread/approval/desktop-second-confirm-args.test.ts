import assert from "node:assert/strict"
import { test } from "node:test"
import {
  desktopSecondConfirmView,
  isDesktopSecondConfirm,
  shortObservationId
} from "./desktop-second-confirm-args.ts"

const PAIR = {
  code: "needs_second_confirm",
  observationId: "obs_c9e2abcd",
  previousObservationId: "obs_a1f3wxyz",
  action: "click",
  appName: "Notes",
  previousAppName: "Calculator",
  appKey: "notes",
  previousAppKey: "calculator",
  elementName: "文本区",
  previousElementName: "=",
  elementRole: "AXTextArea",
  previousElementRole: "AXButton",
  previousThumbnailDataUrl: "data:image/png;base64,old",
  thumbnailDataUrl: "data:image/png;base64,new"
}

test("needs_second_confirm 才走二次确认卡", () => {
  assert.equal(isDesktopSecondConfirm(PAIR), true)
  assert.equal(isDesktopSecondConfirm({ needsSecondConfirm: true }), true)
  assert.equal(isDesktopSecondConfirm({ observationId: "obs", action: "click" }), false)
})

test("A 态：两图可读，主按钮可点，应用/控件对照", () => {
  const view = desktopSecondConfirmView(PAIR)
  assert.equal(view.tone, "warn")
  assert.equal(view.canConfirm, true)
  assert.equal(view.missingThumb, false)
  assert.equal(view.appChanged, true)
  assert.equal(view.previous.appName, "Calculator")
  assert.equal(view.next.appName, "Notes")
  assert.equal(view.previous.control, "=")
  assert.equal(view.next.control, "文本区")
  assert.equal(view.action, "click")
})

test("B 态：缺任一侧缩略图则禁用主按钮", () => {
  const missingNext = desktopSecondConfirmView({ ...PAIR, thumbnailDataUrl: "" })
  assert.equal(missingNext.tone, "danger")
  assert.equal(missingNext.canConfirm, false)
  assert.equal(missingNext.missingThumb, true)
  assert.equal(missingNext.screenshotCode, "screenshot_unavailable")

  const missingPrev = desktopSecondConfirmView({ ...PAIR, previousThumbnailDataUrl: "" })
  assert.equal(missingPrev.canConfirm, false)
})

test("只有路径 id 时标弱身份，不得假装已对齐", () => {
  const view = desktopSecondConfirmView({
    ...PAIR,
    previousElementName: "",
    previousElementRole: "",
    elementName: "",
    elementRole: "",
    elementId: "0.3"
  })
  assert.equal(view.weakIdentity, true)
  assert.equal(view.previous.control, "0.3")
})

test("shortObservationId 截断但不编造", () => {
  assert.equal(shortObservationId("a1f3wxyz99"), "a1f3…99")
  assert.equal(shortObservationId("ab"), "ab")
  assert.equal(shortObservationId(""), "—")
})
