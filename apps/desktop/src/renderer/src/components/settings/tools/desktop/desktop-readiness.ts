/**
 * 电脑操控就绪判定：医生绿必须指向当前 helper，不能只因 Electron AX 就绿。
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

/** Electron 宿主 AX 不算 helper 绿。trusted === false / 无执行器 / 未签名开发包都未就绪。 */
export function desktopReadiness(
  desktop: DesktopComputerUseState,
  doctor: Pick<DesktopDoctorReport, "success" | "code" | "trusted" | "signed" | "accessibility"> | null
): DesktopReadiness {
  const switchOn = desktop.enabled
  const helperOk = Boolean(
    doctor &&
      doctor.success &&
      doctor.code !== "executor_missing" &&
      doctor.trusted !== false &&
      doctor.signed !== false
  )
  const helperDenied = doctor?.trusted === false || doctor?.accessibility === false || doctor?.code === "permission_denied"
  const permsOk = helperOk && !helperDenied
  const ready = switchOn && permsOk && helperOk
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
