/**
 * 设置「电脑操控中心 (Computer Use Hub)」：四段式应用级受控委派控制台。
 * 权限行与徽章都只认医生报告里的 helper，不认宿主 Electron。
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
import { DesktopOnboardingActions } from "./desktop/desktop-onboarding-actions"
import {
  type DesktopView
} from "./desktop/desktop-perception-inspector"
import {
  desktopBlock,
  desktopPermissionFlags,
  desktopReadiness,
  type DesktopBlock
} from "./desktop/desktop-readiness"
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
  const [view, setView] = useState<DesktopView | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [doctor, setDoctor] = useState<DesktopDoctorReport | null>(null)
  const [doctorError, setDoctorError] = useState(false)
  const readiness = desktopReadiness(desktop, doctor)
  const block = !desktop.enabled ? null : doctorError ? "unavailable" : desktopBlock(doctor)
  const permissions = desktopPermissionFlags(doctorError ? null : doctor)
  const hint = block === "no-display" ? null : platformHintKey(desktop.session)

  const refreshDoctor = useCallback(async () => {
    if (!desktop.enabled || !hasIde()) return
    setChecking(true)
    try {
      const report = (await getIde().builtinTools.desktopDoctor()) as DesktopDoctorReport
      setDoctor(report)
      setDoctorError(false)
    } catch {
      setDoctor(null)
      setDoctorError(true)
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
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-medium font-semibold text-text-primary">
                  {t("settings.builtinTools.computerUseTitle")}
                </p>
                <ReadinessBadge ready={readiness.ready} />
              </div>
              <p className="mt-1 text-caption-1-medium leading-relaxed text-text-secondary">
                {t("settings.builtinTools.computerUseDesc")}
              </p>
            </div>
            <Switch
              checked={desktop.enabled}
              onCheckedChange={onToggleComputerUse}
              aria-label={t("settings.builtinTools.computerUseTitle")}
            />
          </div>

          {desktop.enabled ? (
            <div className="flex flex-col divide-y divide-separator-border/50">
              {/* 未就绪原因与跨平台提示 */}
              {(block || hint) ? (
                <div className="pb-4">
                  {block ? <p className="text-caption-1-medium text-text-secondary">{t(BLOCK_COPY[block])}</p> : null}
                  {hint ? <p className="mt-1 text-caption-1-medium leading-relaxed text-text-secondary">{t(hint)}</p> : null}
                </div>
              ) : null}

              {/* 第 1 段：驱动环境与系统权限 */}
              {permissions.show ? (
                <div className="py-4 first:pt-0">
                  <DesktopMacPermissions
                    session={desktop.session}
                    show={permissions.show}
                    accessibilityGranted={permissions.accessibility}
                    screenCaptureGranted={permissions.screenCapture}
                    onOpenPermission={onOpenPermission}
                  />
                </div>
              ) : null}

              {/* 第 2 段：交互反馈与安全制动 */}
              <div className="py-4 first:pt-0">
                <VisualsRow
                  previewing={previewing}
                  checked={desktop.screenVisuals ?? true}
                  onPreview={() => void previewOverlay(setPreviewing)}
                  onToggle={onToggleScreenVisuals}
                />
              </div>

              {/* 第 3 段：应用授权与受保护禁区 */}
              <div className="flex flex-col gap-4 py-4 first:pt-0">
                <DesktopAlwaysAllowList
                  apps={desktop.alwaysAllowApps ?? []}
                  onRevoke={(appKey) => onRevokeAlwaysAllow?.(appKey)}
                />

                <DesktopAnyDesktopDetails
                  sessionId={sessionId}
                  enabled={desktop.anyDesktopSession === true}
                  onToggle={(value) => onToggleAnyDesktop?.(value)}
                />
              </div>

              {/* 第 4 段：屏幕感知透视与快速体验 */}
              <div className="pt-4 first:pt-0">
                <DesktopOnboardingActions
                  checking={checking}
                  capturing={capturing}
                  inspectorOpen={inspectorOpen}
                  preview={thumb}
                  view={view}
                  onCheck={() => void refreshDoctor()}
                  onInspect={() => void inspectPerception(setCapturing, setThumb, setView, setInspectorOpen)}
                  onCloseInspector={() => setInspectorOpen(false)}
                  onTryCalculator={() => void startCalculatorTryFlow(() => navigate({ to: "/" }))}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const BLOCK_COPY: Record<DesktopBlock, string> = {
  missing: "settings.builtinTools.blockMissing",
  unsigned: "settings.builtinTools.blockUnsigned",
  permissions: "settings.builtinTools.blockPermissions",
  "no-display": "settings.builtinTools.blockNoDisplay",
  unavailable: "settings.builtinTools.blockUnavailable"
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
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          disabled={previewing}
          className="h-8 rounded-lg px-3 text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          {previewing ? t("settings.builtinTools.previewing") : t("settings.builtinTools.previewVisuals")}
        </Button>
        <Switch
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={t("settings.builtinTools.screenVisualsTitle")}
        />
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

async function inspectPerception(
  setCapturing: (value: boolean) => void,
  setThumb: (value: string) => void,
  setView: (value: DesktopView | null) => void,
  setInspectorOpen: (value: boolean) => void
) {
  if (!hasIde()) return
  setCapturing(true)
  setInspectorOpen(true)
  try {
    const [captureResult, viewResult] = await Promise.allSettled([
      getIde().builtinTools.desktopCapturePreview() as Promise<{ thumbnailDataUrl?: string }>,
      getIde().builtinTools.desktopView() as Promise<DesktopView | null>
    ])
    if (captureResult.status === "fulfilled") {
      setThumb(captureResult.value?.thumbnailDataUrl ?? "")
    } else {
      setThumb("")
    }
    if (viewResult.status === "fulfilled") {
      setView(viewResult.value ?? null)
    } else {
      setView(null)
    }
  } catch {
    setThumb("")
    setView(null)
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
