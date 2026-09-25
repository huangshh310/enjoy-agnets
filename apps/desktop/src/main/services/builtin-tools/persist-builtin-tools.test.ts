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
