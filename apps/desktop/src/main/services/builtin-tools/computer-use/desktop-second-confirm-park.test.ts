import assert from "node:assert/strict"
import test from "node:test"
import {
  confirmActArgs,
  isDesktopSecondConfirmResult,
  mergeSecondConfirmArgs
} from "./desktop-second-confirm-park.ts"

test("mergeSecondConfirmArgs 把 observationId 换成新号并保留批前对照", () => {
  const merged = mergeSecondConfirmArgs(
    {
      observationId: "obs_old",
      action: "click",
      elementId: "0.1",
      appName: "Calculator",
      appKey: "calculator",
      elementName: "=",
      thumbnailPath: "/tmp/old.png"
    },
    {
      success: false,
      code: "needs_second_confirm",
      observationId: "obs_new",
      previousObservationId: "obs_old",
      previousThumbnailPath: "/tmp/old.png",
      thumbnailPath: "/tmp/new.png",
      appName: "Notes",
      previousAppName: "Calculator",
      appKey: "notes",
      previousAppKey: "calculator",
      action: "click",
      elementName: "正文",
      previousElementName: "="
    }
  )
  assert.equal(merged.observationId, "obs_new")
  assert.equal(merged.previousObservationId, "obs_old")
  assert.equal(merged.needsSecondConfirm, true)
  assert.equal(merged.bypassesSessionAllow, true)
  assert.equal(merged.previousAppName, "Calculator")
  assert.equal(merged.appName, "Notes")
  assert.equal(merged.previousElementName, "=")
  assert.equal(merged.elementName, "正文")
  assert.equal(merged.elementId, "0.1")
})

test("confirmActArgs 丢掉二次确认 UI 字段，保留新观察号", () => {
  const next = confirmActArgs({
    observationId: "obs_new",
    action: "click",
    elementId: "0.1",
    code: "needs_second_confirm",
    needsSecondConfirm: true,
    thumbnailDataUrl: "data:image/png;base64,xx",
    previousThumbnailDataUrl: "data:image/png;base64,yy",
    screenshotUnavailable: "screenshot_unavailable"
  })
  assert.equal(next.observationId, "obs_new")
  assert.equal(next.action, "click")
  assert.equal(next.code, undefined)
  assert.equal(next.needsSecondConfirm, undefined)
  assert.equal(next.thumbnailDataUrl, undefined)
})

test("只有 needs_second_confirm 才算二次确认结果", () => {
  assert.equal(isDesktopSecondConfirmResult({ success: false, code: "needs_second_confirm" }), true)
  assert.equal(isDesktopSecondConfirmResult({ success: false, code: "stale_observation" }), false)
  assert.equal(isDesktopSecondConfirmResult({ success: true }), false)
})
