/**
 * 电脑操控就绪：绿只认 helperSigned + helper AX。
 * 设置页只消费 ready 与一句阻断原因，不展示路径或签名细节。
 */
import type { DesktopComputerUseState, DesktopDoctorReport } from "@enjoy-agents/ipc-contract"

export type DesktopReadiness = { ready: boolean }

export type DesktopBlock = "missing" | "unsigned" | "permissions" | "no-display" | "unavailable"

const HELPER_BLOCK_CODES = new Set(["executor_missing", "executor_unsigned", "executor_identity_mismatch"])

export type DoctorIdentity = Pick<
  DesktopDoctorReport,
  | "success"
  | "code"
  | "helperSigned"
  | "helperMatchesSpawn"
  | "trusted"
  | "accessibility"
  | "screenCapture"
  | "session"
>

/** helper 身份绿：必须 helperSigned，禁止 unsigned / mismatch / 路径错位。 */
export function helperIdentityOk(doctor: DoctorIdentity | null): boolean {
  if (!doctor || doctor.helperSigned !== true) return false
  if (doctor.helperMatchesSpawn === false) return false
  return !HELPER_BLOCK_CODES.has(doctor.code ?? "")
}

/** helper 自己的 AX，不是 hostAccessibility。 */
export function helperAccessibilityOk(doctor: DoctorIdentity | null): boolean {
  if (!doctor) return false
  if (doctor.trusted === false || doctor.accessibility === false) return false
  return doctor.code !== "permission_denied"
}

/**
 * 未就绪时的一句原因。医生还没回来时不编造。
 * Wayland / Windows / X11 交给平台提示，这里不再叠一句。
 */
export function desktopBlock(doctor: DoctorIdentity | null): DesktopBlock | null {
  if (!doctor) return null
  if (doctor.code === "doctor_unavailable") return "unavailable"
  if (doctor.code === "executor_missing") return "missing"
  if (doctor.code === "no_display" || doctor.session === "none") return "no-display"
  if (
    doctor.code === "executor_unsigned" ||
    doctor.code === "executor_identity_mismatch" ||
    doctor.helperSigned !== true
  ) {
    return "unsigned"
  }
  if (doctor.session === "wayland" || doctor.session === "windows" || doctor.session === "x11") return null
  if (!helperAccessibilityOk(doctor) || doctor.screenCapture !== true) return "permissions"
  if (doctor.success !== true) return "permissions"
  return null
}

/** 权限行只在「差的是系统授权」或已经就绪时出现，并且只认 helper AX 与医生看到的录屏。 */
export function desktopPermissionFlags(doctor: DoctorIdentity | null): {
  show: boolean
  accessibility: boolean
  screenCapture: boolean
} {
  const block = desktopBlock(doctor)
  const show = Boolean(doctor) && (block === null || block === "permissions")
  return {
    show,
    accessibility: show && helperAccessibilityOk(doctor),
    screenCapture: show && doctor?.screenCapture === true
  }
}

export function desktopReadiness(desktop: DesktopComputerUseState, doctor: DoctorIdentity | null): DesktopReadiness {
  const helperOk = helperIdentityOk(doctor)
  const permsOk = helperAccessibilityOk(doctor) && doctor?.screenCapture === true
  return { ready: Boolean(desktop.enabled && doctor?.success && helperOk && permsOk) }
}
