import assert from "node:assert/strict"
import { test } from "node:test"
import { desktopReadiness, helperIdentityOk } from "./desktop-readiness.ts"

const off = {
  enabled: false,
  accessibilityGranted: true,
  screenCaptureGranted: true,
  screenVisuals: true,
  anyDesktopSession: false,
  session: "macos" as const
}

const greenDoctor = {
  success: true,
  trusted: true,
  helperSigned: true,
  accessibility: true,
  screenCapture: true
}

test("Electron AX 绿、helper 未授信时不得就绪", () => {
  const ready = desktopReadiness(
    { ...off, enabled: true },
    { success: true, trusted: false, helperSigned: true, accessibility: false }
  )
  assert.equal(ready.ready, false)
  assert.equal(ready.helperOk, true)
  assert.equal(ready.permsOk, false)
})

test("开关关着一律未就绪", () => {
  const ready = desktopReadiness(off, greenDoctor)
  assert.equal(ready.ready, false)
  assert.equal(ready.switchOn, false)
})

test("helperSigned 且 helper AX 才就绪", () => {
  const ready = desktopReadiness({ ...off, enabled: true }, greenDoctor)
  assert.equal(ready.ready, true)
  assert.equal(ready.helperOk, true)
})

test("executor_unsigned 不得绿，即使宿主 AX 已开", () => {
  const unsigned = {
    success: false,
    code: "executor_unsigned" as const,
    helperSigned: false,
    trusted: true,
    accessibility: true,
    screenCapture: true
  }
  const ready = desktopReadiness({ ...off, enabled: true, accessibilityGranted: true }, unsigned)
  assert.equal(ready.ready, false)
  assert.equal(ready.helperOk, false)
  assert.equal(helperIdentityOk(unsigned), false)
})

test("遗留 signed / 宿主 AX 不能冒充 helperSigned", () => {
  const ready = desktopReadiness(
    { ...off, enabled: true, accessibilityGranted: true },
    { success: true, trusted: true, accessibility: true, screenCapture: true }
  )
  assert.equal(ready.ready, false)
  assert.equal(ready.helperOk, false)
})

test("executor_identity_mismatch 不得就绪", () => {
  const ready = desktopReadiness(
    { ...off, enabled: true },
    { success: false, code: "executor_identity_mismatch", helperSigned: true, helperMatchesSpawn: false }
  )
  assert.equal(ready.ready, false)
  assert.equal(ready.helperOk, false)
})
