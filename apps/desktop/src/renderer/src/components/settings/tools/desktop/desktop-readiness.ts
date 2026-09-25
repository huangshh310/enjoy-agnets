/**
 * 电脑操控就绪：绿只认 helperSigned + helper AX，不用宿主 Electron AX / 遗留 signed。
 */
import type { DesktopComputerUseState, DesktopDoctorReport } from "@enjoy-agents/ipc-contract"

export type DesktopStepState = "ok" | "warn" | "off"

export type DesktopReadiness = {
  ready: boolean
  switchOn: boolean
  permsOk: boolean
  helperOk: boolean
  switchState: DesktopStepState
  permsState: DesktopStepState
  helperState: DesktopStepState
}

const HELPER_BLOCK_CODES = new Set(["executor_missing", "executor_unsigned", "executor_identity_mismatch"])

export type DoctorIdentity = Pick<
  DesktopDoctorReport,
  "success" | "code" | "helperSigned" | "helperMatchesSpawn" | "trusted" | "accessibility" | "screenCapture"
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

export function desktopReadiness(desktop: DesktopComputerUseState, doctor: DoctorIdentity | null): DesktopReadiness {
  const switchOn = desktop.enabled
  const helperOk = helperIdentityOk(doctor)
  const axOk = helperAccessibilityOk(doctor)
  const screenOk = doctor?.screenCapture !== false
  const permsOk = axOk && screenOk
  const ready = Boolean(switchOn && doctor?.success && helperOk && permsOk)
  return {
    ready,
    switchOn,
    permsOk,
    helperOk,
    switchState: switchOn ? "ok" : "off",
    permsState: !switchOn ? "off" : permsOk ? "ok" : "warn",
    helperState: !switchOn ? "off" : helperOk ? "ok" : "warn"
  }
}
