/**
 * 权限医生：点位认 helperSigned + helper AX，不用宿主 Electron AX 假绿。
 */
import type { DesktopDoctorReport } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { helperAccessibilityOk, helperIdentityOk } from "./desktop-readiness"

export function DesktopDoctorPanel({
  doctor,
  ready
}: {
  doctor: DesktopDoctorReport | null
  ready: boolean
}) {
  const t = useT()
  if (!doctor) return null
  return (
    <div
      className={cx(
        "rounded-xl border px-3 py-2.5",
        ready ? "border-border-button-default bg-background-secondary-default" : "border-text-warning-primary/30 bg-text-warning-primary/5"
      )}
    >
      <p className={cx("text-caption-1-semibold", ready ? "text-text-primary" : "text-text-warning-primary")}>
        {t("settings.builtinTools.doctorTitle")}
      </p>
      <p className="mt-1 text-caption-1-medium text-text-secondary">{doctor.line}</p>
      {doctor.helperPath ? <p className="mt-1 truncate text-caption-2-medium text-text-tertiary">{doctor.helperPath}</p> : null}
      <ul className="mt-1.5 space-y-1 text-caption-1-medium text-text-secondary">
        <DoctorDot ok={doctor.screenCapture !== false} label={t("settings.builtinTools.screenCapture")} />
        <DoctorDot ok={helperIdentityOk(doctor)} label={t("settings.builtinTools.helperSignedDot")} />
        <DoctorDot ok={helperAccessibilityOk(doctor)} label={`${t("settings.builtinTools.accessibility")} · helper`} />
      </ul>
    </div>
  )
}

function DoctorDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cx("size-1.5 rounded-full", ok ? "bg-state-success-text" : "bg-text-error-primary")} />
      {label}
    </li>
  )
}
