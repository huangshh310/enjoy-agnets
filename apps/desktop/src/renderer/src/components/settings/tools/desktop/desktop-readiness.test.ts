import assert from "node:assert/strict"
import { test } from "node:test"
import { desktopBlock, desktopPermissionFlags, desktopReadiness, helperIdentityOk } from "./desktop-readiness.ts"

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
  const doctor = { success: true, trusted: false, helperSigned: true, accessibility: false }
  const ready = desktopReadiness({ ...off, enabled: true }, doctor)
  assert.equal(ready.ready, false)
  assert.equal(desktopBlock(doctor), "permissions")
})

test("开关关着一律未就绪", () => {
  assert.equal(desktopReadiness(off, greenDoctor).ready, false)
})

test("helperSigned 且 helper AX 才就绪，不再给阻断句", () => {
  const ready = desktopReadiness({ ...off, enabled: true }, greenDoctor)
  assert.equal(ready.ready, true)
  assert.equal(desktopBlock(greenDoctor), null)
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
  assert.equal(desktopBlock(unsigned), "unsigned")
  assert.equal(helperIdentityOk(unsigned), false)
})

test("遗留 signed / 宿主 AX 不能冒充 helperSigned", () => {
  const doctor = { success: true, trusted: true, accessibility: true, screenCapture: true }
  const ready = desktopReadiness({ ...off, enabled: true, accessibilityGranted: true }, doctor)
  assert.equal(ready.ready, false)
  assert.equal(desktopBlock(doctor), "unsigned")
})

test("未签名时不把辅助功能行显示成未授权", () => {
  const unsigned = {
    success: false,
    code: "executor_unsigned" as const,
    helperSigned: false,
    trusted: true,
    accessibility: true,
    screenCapture: true
  }
  assert.deepEqual(desktopPermissionFlags(unsigned), {
    show: false,
    accessibility: false,
    screenCapture: false
  })
})

test("只缺 helper AX 时权限行显示辅助功能未授权、录屏已授权", () => {
  const doctor = {
    success: false,
    code: "permission_denied" as const,
    helperSigned: true,
    trusted: false,
    accessibility: false,
    screenCapture: true,
    session: "macos" as const
  }
  assert.equal(desktopBlock(doctor), "permissions")
  assert.deepEqual(desktopPermissionFlags(doctor), {
    show: true,
    accessibility: false,
    screenCapture: true
  })
})

test("没有图形会话只留一句，Wayland 交给平台提示", () => {
  assert.equal(desktopBlock({ success: false, code: "no_display", helperSigned: true, session: "none" }), "no-display")
  assert.equal(
    desktopBlock({
      success: false,
      helperSigned: true,
      trusted: true,
      accessibility: true,
      screenCapture: true,
      session: "wayland"
    }),
    null
  )
})

test("医生请求失败给 unavailable，不假装没执行器", () => {
  assert.equal(desktopBlock({ success: false, code: "doctor_unavailable" }), "unavailable")
})

test("executor_identity_mismatch 不得就绪", () => {
  const doctor = {
    success: false,
    code: "executor_identity_mismatch" as const,
    helperSigned: true,
    helperMatchesSpawn: false
  }
  const ready = desktopReadiness({ ...off, enabled: true }, doctor)
  assert.equal(ready.ready, false)
  assert.equal(desktopBlock(doctor), "unsigned")
})
