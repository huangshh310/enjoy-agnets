/**
 * 设置「电脑操控」：开通三拍 + 当前 helper 医生 + 试一下。不是第二套遥控器。
 */
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { DesktopComputerUseState, DesktopDoctorReport } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DesktopMacPermissions } from "./desktop-mac-permissions"
import { DesktopAlwaysAllowList } from "./desktop/desktop-always-allow-list"
import { DesktopAnyDesktopDetails } from "./desktop/desktop-any-desktop-details"
import { DesktopDoctorPanel } from "./desktop/desktop-doctor-panel"
import { DesktopOnboardingActions } from "./desktop/desktop-onboarding-actions"
import { desktopReadiness } from "./desktop/desktop-readiness"
import { DesktopReadinessStrip } from "./desktop/desktop-readiness-strip"
import { startCalculatorTryFlow } from "./desktop/start-calculator-try"

export function DesktopToolsCard({
  desktop,
  sessionId,
  onToggleComputerUse,
  onToggleScreenVisuals,
  onToggleAnyDesktop,
  onRevokeAlwaysAllow,
  onOpenPermission
}: {
  desktop: DesktopComputerUseState
  sessionId?: string | null
  onToggleComputerUse: (enabled: boolean) => void
  onToggleScreenVisuals?: (enabled: boolean) => void
  onToggleAnyDesktop?: (enabled: boolean) => void
  onRevokeAlwaysAllow?: (appKey: string) => void
  onOpenPermission: (permission: "accessibility" | "screenCapture") => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const [previewing, setPreviewing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [thumb, setThumb] = useState("")
  const [doctor, setDoctor] = useState<DesktopDoctorReport | null>(null)
  const hint = platformHintKey(desktop.session)
  const readiness = desktopReadiness(desktop, doctor)

  const refreshDoctor = useCallback(async () => {
    if (!desktop.enabled || !hasIde()) return
    setChecking(true)
    try {
      const report = (await getIde().builtinTools.desktopDoctor()) as DesktopDoctorReport
      setDoctor(report)
    } catch {
      setDoctor(null)
    } finally {
      setChecking(false)
    }
  }, [desktop.enabled])

  useEffect(() => {
    void refreshDoctor()
  }, [refreshDoctor])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.builtinTools.desktopSection")}</h3>
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-medium text-text-primary">{t("settings.builtinTools.computerUseTitle")}</p>
                <ReadinessBadge ready={readiness.ready} />
              </div>
              <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("settings.builtinTools.computerUseDesc")}</p>
            </div>
            <Switch
              checked={desktop.enabled}
              onCheckedChange={onToggleComputerUse}
              aria-label={t("settings.builtinTools.computerUseTitle")}
            />
          </div>
          <DesktopReadinessStrip readiness={readiness} />
          {desktop.enabled ? (
            <div className="flex flex-col gap-3.5">
              <DesktopDoctorPanel doctor={doctor} ready={readiness.ready} />
              {hint ? <p className="text-caption-1-medium leading-relaxed text-text-secondary">{t(hint)}</p> : null}
              <DesktopOnboardingActions
                checking={checking}
                capturing={capturing}
                preview={thumb}
                onCheck={() => void refreshDoctor()}
                onCapture={() => void capturePreview(setCapturing, setThumb)}
                onTryCalculator={() => void startCalculatorTryFlow(() => navigate({ to: "/" }))}
              />
              <DesktopMacPermissions desktop={desktop} onOpenPermission={onOpenPermission} />
              <VisualsRow
                previewing={previewing}
                checked={desktop.screenVisuals ?? true}
                onPreview={() => void previewOverlay(setPreviewing)}
                onToggle={onToggleScreenVisuals}
              />
              <DesktopAlwaysAllowList
                apps={desktop.alwaysAllowApps ?? []}
                onRevoke={(appKey) => onRevokeAlwaysAllow?.(appKey)}
              />
              <DesktopAnyDesktopDetails
                sessionId={sessionId}
                enabled={desktop.anyDesktopSession === true}
                onToggle={(value) => onToggleAnyDesktop?.(value)}
              />
              <p className="text-caption-1-medium leading-relaxed text-text-tertiary">{t("settings.builtinTools.desktopTip")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReadinessBadge({ ready }: { ready: boolean }) {
  const t = useT()
  return (
    <span
      className={
        ready
          ? "rounded-full bg-state-success-base px-2 py-0.5 text-caption-2-semibold text-state-success-text ring-1 ring-state-success-text/20"
          : "rounded-full bg-text-warning-primary/10 px-2 py-0.5 text-caption-2-semibold text-text-warning-primary ring-1 ring-text-warning-primary/20"
      }
    >
      {ready ? t("settings.builtinTools.ready") : t("settings.builtinTools.notReady")}
    </span>
  )
}

function VisualsRow({
  previewing,
  checked,
  onPreview,
  onToggle
}: {
  previewing: boolean
  checked: boolean
  onPreview: () => void
  onToggle?: (enabled: boolean) => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1 pr-4">
        <span className="text-body-medium text-text-primary">{t("settings.builtinTools.screenVisualsTitle")}</span>
        <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("settings.builtinTools.screenVisualsDesc")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button variant="outline" size="sm" onClick={onPreview} disabled={previewing} className="h-8 rounded-lg px-3 text-caption-1-medium text-text-secondary hover:text-text-primary">
          {previewing ? t("settings.builtinTools.previewing") : t("settings.builtinTools.previewVisuals")}
        </Button>
        <Switch checked={checked} onCheckedChange={onToggle} aria-label={t("settings.builtinTools.screenVisualsTitle")} />
      </div>
    </div>
  )
}

async function previewOverlay(setPreviewing: (value: boolean) => void) {
  if (!hasIde()) return
  setPreviewing(true)
  try {
    await getIde().builtinTools.previewOverlay()
  } finally {
    setTimeout(() => setPreviewing(false), 3000)
  }
}

async function capturePreview(setCapturing: (value: boolean) => void, setThumb: (value: string) => void) {
  if (!hasIde()) return
  setCapturing(true)
  try {
    const result = (await getIde().builtinTools.desktopCapturePreview()) as { thumbnailDataUrl?: string }
    setThumb(result.thumbnailDataUrl ?? "")
  } catch {
    setThumb("")
  } finally {
    setCapturing(false)
  }
}

function platformHintKey(session?: string) {
  if (session === "windows") return "settings.builtinTools.platformHintWindows" as const
  if (session === "x11") return "settings.builtinTools.platformHintX11" as const
  if (session === "wayland") return "settings.builtinTools.platformHintWayland" as const
  if (session === "none") return "settings.builtinTools.platformHintNone" as const
  return null
}
