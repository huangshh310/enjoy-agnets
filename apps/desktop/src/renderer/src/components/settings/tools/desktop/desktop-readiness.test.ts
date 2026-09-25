import assert from "node:assert/strict"
import { test } from "node:test"
import { desktopReadiness } from "./desktop-readiness.ts"

const off = {
  enabled: false,
  accessibilityGranted: true,
  screenCaptureGranted: true,
  screenVisuals: true,
  anyDesktopSession: false,
  session: "macos" as const
}

test("Electron AX 绿、helper 未授信时不得就绪", () => {
  const ready = desktopReadiness(
    { ...off, enabled: true },
    { success: true, code: undefined, trusted: false, signed: undefined, accessibility: false }
  )
  assert.equal(ready.ready, false)
  assert.equal(ready.helperOk, false)
  assert.equal(ready.permsOk, false)
})

test("开关关着一律未就绪", () => {
  const ready = desktopReadiness(off, { success: true, trusted: true })
  assert.equal(ready.ready, false)
  assert.equal(ready.switchOn, false)
})

test("helper 成功且授信才就绪", () => {
  const ready = desktopReadiness(
    { ...off, enabled: true },
    { success: true, trusted: true, signed: true, accessibility: true }
  )
  assert.equal(ready.ready, true)
  assert.equal(ready.helperOk, true)
})
