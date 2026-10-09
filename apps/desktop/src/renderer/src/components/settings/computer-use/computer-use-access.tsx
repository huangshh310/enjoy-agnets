/**
 * 电脑操控权限行。只认即将启动的 helper。未签名不画「打开设置」。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import type { ComputerUseDoctorPhase } from "./use-computer-use-page"
import { desktopBlock, desktopPermissionFlags } from "../tools/desktop/desktop-readiness"

type Permission = "accessibility" | "screenCapture" | "inputMonitoring"

const BLOCK_COPY = {
  missing: "settings.builtinTools.blockMissing",
  unsigned: "settings.builtinTools.blockUnsigned",
  unavailable: "settings.builtinTools.blockUnavailable"
} as const

export function ComputerUseAccess({
  phase,
  onOpen
}: {
  phase: ComputerUseDoctorPhase
  onOpen: (permission: Permission) => void
}) {
  const t = useT()
  if (phase.kind === "loading") {
    return <p className="text-caption-1-medium text-text-secondary">{t("settings.computerUse.checking")}</p>
  }
  if (phase.kind === "error") {
    return <p className="text-caption-1-medium text-text-secondary">{t("settings.builtinTools.blockUnavailable")}</p>
  }
  const doctor = phase.report
  if (doctor.session === "none") {
    return <p className="text-caption-1-medium text-text-secondary">{t("settings.builtinTools.blockNoDisplay")}</p>
  }
  if (doctor.session !== "macos") {
    return <p className="text-caption-1-medium text-text-secondary">{t("settings.computerUse.notVerified")}</p>
  }
  const block = desktopBlock(doctor)
  if (block === "unsigned" || block === "missing" || block === "unavailable") {
    return <p className="text-caption-1-medium text-text-secondary">{t(BLOCK_COPY[block])}</p>
  }
  const flags = desktopPermissionFlags(doctor)
  if (!flags.show) return null
  const listen = doctor.helperSigned === true && doctor.inputMonitoring === true
  return (
    <div className="flex flex-col gap-3">
      <AccessRow
        title={t("settings.builtinTools.accessibility")}
        body={t("settings.builtinTools.accessibilityDesc")}
        granted={flags.accessibility}
        onOpen={() => onOpen("accessibility")}
      />
      <AccessRow
        title={t("settings.builtinTools.screenCapture")}
        body={t("settings.builtinTools.screenCaptureDesc")}
        granted={flags.screenCapture}
        onOpen={() => onOpen("screenCapture")}
      />
      <AccessRow
        title={t("settings.computerUse.inputMonitoring")}
        body={t("settings.computerUse.inputMonitoringDesc")}
        granted={listen}
        onOpen={() => onOpen("inputMonitoring")}
      />
      <p className="text-caption-2-medium leading-relaxed text-text-tertiary">
        {t("settings.builtinTools.permissionsSilentNote")}
      </p>
      <p className="text-caption-2-medium leading-relaxed text-text-tertiary">
        {t(listen ? "settings.computerUse.escGlobal" : "settings.computerUse.escLocal")}
      </p>
    </div>
  )
}

function AccessRow({
  title,
  body,
  granted,
  onOpen
}: {
  title: string
  body: string
  granted: boolean
  onOpen: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-caption-1-medium text-text-secondary">{body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-caption-2-medium text-text-tertiary">
          {t(granted ? "settings.builtinTools.granted" : "settings.builtinTools.notGranted")}
        </span>
        <Button variant="outline" size="sm" onClick={onOpen} className="h-8 rounded-lg px-3 text-caption-1-medium">
          {t("settings.builtinTools.openSettings")}
        </Button>
      </div>
    </div>
  )
}
