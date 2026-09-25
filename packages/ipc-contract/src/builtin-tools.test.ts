import test from "node:test"
import assert from "node:assert/strict"
import {
  BuiltinToolsState,
  DesktopActApprovalArgs,
  GetBuiltinToolsStateInput,
  ToggleBuiltinToolInput,
  OpenSystemPermissionInput
} from "./builtin-tools.ts"

test("BuiltinToolsState validates default structure", () => {
  const parsed = BuiltinToolsState.parse({
    builtinBrowser: { enabled: false },
    browserBridge: {
      enabled: false,
      port: 47823,
      pairingCode: "enjoy-bridge:47823:abc123token"
    },
    computerUse: {
      enabled: false,
      accessibilityGranted: false,
      screenCaptureGranted: false
    }
  })
  assert.equal(parsed.builtinBrowser.enabled, false)
  assert.equal(parsed.browserBridge.port, 47823)
  assert.equal(parsed.browserBridge.connectedBrowser, null)
  assert.equal(parsed.computerUse.screenVisuals, true)
  assert.equal(parsed.computerUse.anyDesktopSession, false)
})

test("GetBuiltinToolsStateInput 可带 sessionId", () => {
  assert.equal(GetBuiltinToolsStateInput.parse({}).sessionId, undefined)
  assert.equal(GetBuiltinToolsStateInput.parse({ sessionId: "sess_a" }).sessionId, "sess_a")
})

test("ToggleBuiltinToolInput validates tools enum", () => {
  const valid = ToggleBuiltinToolInput.parse({ tool: "browserBridge", enabled: true })
  assert.equal(valid.tool, "browserBridge")
  assert.equal(valid.enabled, true)

  const anyDesktop = ToggleBuiltinToolInput.parse({
    tool: "anyDesktopSession",
    enabled: true,
    sessionId: "sess_a"
  })
  assert.equal(anyDesktop.sessionId, "sess_a")

  assert.throws(() => {
    ToggleBuiltinToolInput.parse({ tool: "unknownTool", enabled: true })
  })
})

test("DesktopActApprovalArgs 收 appKeySource 与 bypassesSessionAllow", () => {
  const parsed = DesktopActApprovalArgs.parse({
    observationId: "obs",
    action: "click",
    appKey: "com.apple.calculator",
    appKeySource: "bundleId",
    bypassesSessionAllow: false
  })
  assert.equal(parsed.appKeySource, "bundleId")
  assert.equal(parsed.bypassesSessionAllow, false)
})

test("DesktopActApprovalArgs 收二次确认新旧缩略图", () => {
  const parsed = DesktopActApprovalArgs.parse({
    observationId: "obs_new",
    action: "click",
    needsSecondConfirm: true,
    previousThumbnailPath: "/thumbs/at-allow.png",
    previousThumbnailDataUrl: "data:image/png;base64,OLD",
    thumbnailPath: "/thumbs/after-resnap.png",
    thumbnailDataUrl: "data:image/png;base64,NEW"
  })
  assert.equal(parsed.needsSecondConfirm, true)
  assert.equal(parsed.previousThumbnailDataUrl, "data:image/png;base64,OLD")
  assert.equal(parsed.thumbnailDataUrl, "data:image/png;base64,NEW")
})

test("OpenSystemPermissionInput validates permission enum", () => {
  const valid = OpenSystemPermissionInput.parse({ permission: "accessibility" })
  assert.equal(valid.permission, "accessibility")
})
