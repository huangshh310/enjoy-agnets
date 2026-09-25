import test from "node:test"
import assert from "node:assert/strict"
import {
  BuiltinToolsState,
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

test("ToggleBuiltinToolInput validates tools enum", () => {
  const valid = ToggleBuiltinToolInput.parse({ tool: "browserBridge", enabled: true })
  assert.equal(valid.tool, "browserBridge")
  assert.equal(valid.enabled, true)

  assert.throws(() => {
    ToggleBuiltinToolInput.parse({ tool: "unknownTool", enabled: true })
  })
})

test("OpenSystemPermissionInput validates permission enum", () => {
  const valid = OpenSystemPermissionInput.parse({ permission: "accessibility" })
  assert.equal(valid.permission, "accessibility")
})
