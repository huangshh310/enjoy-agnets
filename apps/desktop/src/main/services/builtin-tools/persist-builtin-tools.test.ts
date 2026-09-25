import assert from "node:assert/strict"
import test from "node:test"
import { persistableBuiltinTools } from "./persist-builtin-tools.ts"

test("落盘形状丢掉 anyDesktopSession，不把它当会话 Allow", () => {
  const saved = persistableBuiltinTools({
    computerUseEnabled: true,
    anyDesktopSession: true,
    builtinBrowserEnabled: false,
    bridgePort: 47823,
    bridgeToken: "tok"
  })
  assert.equal(saved.computerUseEnabled, true)
  assert.equal(saved.bridgePort, 47823)
  assert.equal("anyDesktopSession" in saved, false)
  assert.equal(JSON.stringify(saved).includes("anyDesktopSession"), false)
})

test("落盘形状不收 Always-allow 簿，簿只活在 preferences", () => {
  const saved = persistableBuiltinTools({
    computerUseEnabled: true,
    alwaysAllowAppKeys: ["com.apple.calculator", "desktop_act:*"],
    desktopAlwaysAllowAppKeys: ["com.apple.calculator"]
  })
  assert.equal(JSON.stringify(saved).includes("alwaysAllow"), false)
  assert.equal(JSON.stringify(saved).includes("desktopAlwaysAllow"), false)
})
