/**
 * 始终允许、高级坐标、本会话任意桌面、感知试用。画面和权限不在这里再画。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { DesktopComputerUseState } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SettingsCard } from "../settings-row"
import { DesktopAdvancedCoordsRow } from "../tools/desktop/desktop-advanced-coords-row"
import { DesktopAlwaysAllowList } from "../tools/desktop/desktop-always-allow-list"
import { DesktopAnyDesktopDetails } from "../tools/desktop/desktop-any-desktop-details"
import { DesktopOnboardingActions } from "../tools/desktop/desktop-onboarding-actions"
import { type DesktopView } from "../tools/desktop/desktop-perception-inspector"
import { startCalculatorTryFlow } from "../tools/desktop/start-calculator-try"

export function ComputerUseOperations({
  desktop,
  sessionId,
  advancedCoords,
  onToggleAnyDesktop,
  onToggleAdvancedCoords,
  onRevoke,
  onRecheck
}: {
  desktop: DesktopComputerUseState
  sessionId?: string | null
  advancedCoords: boolean
  onToggleAnyDesktop: (enabled: boolean) => void
  onToggleAdvancedCoords: (enabled: boolean) => void
  onRevoke: (appKey: string) => void
  onRecheck: () => Promise<void>
}) {
  const lab = usePerceptionLab(onRecheck)
  return (
    <SettingsCard>
      <div className="flex flex-col gap-4 px-5 py-4">
        <DesktopAlwaysAllowList apps={desktop.alwaysAllowApps ?? []} onRevoke={onRevoke} />
        <DesktopAdvancedCoordsRow enabled={advancedCoords} onToggle={onToggleAdvancedCoords} />
        <DesktopAnyDesktopDetails
          sessionId={sessionId}
          enabled={desktop.anyDesktopSession === true}
          onToggle={onToggleAnyDesktop}
        />
      </div>
      <div className="px-5 py-4">
        <DesktopOnboardingActions
          checking={lab.checking}
          capturing={lab.capturing}
          inspectorOpen={lab.inspectorOpen}
          preview={lab.thumb}
          view={lab.view}
          onCheck={lab.check}
          onInspect={lab.inspect}
          onCloseInspector={lab.closeInspector}
          onTryCalculator={lab.tryCalculator}
        />
      </div>
    </SettingsCard>
  )
}

function usePerceptionLab(onRecheck: () => Promise<void>) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [thumb, setThumb] = useState("")
  const [view, setView] = useState<DesktopView | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  return {
    checking,
    capturing,
    thumb,
    view,
    inspectorOpen,
    check: () => void runCheck(onRecheck, setChecking),
    inspect: () => void inspectPerception(setCapturing, setThumb, setView, setInspectorOpen),
    closeInspector: () => setInspectorOpen(false),
    tryCalculator: () => void startCalculatorTryFlow(() => navigate({ to: "/" }))
  }
}

async function runCheck(onRecheck: () => Promise<void>, setChecking: (value: boolean) => void) {
  setChecking(true)
  try {
    await onRecheck()
  } finally {
    setChecking(false)
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
    setThumb(captureResult.status === "fulfilled" ? captureResult.value?.thumbnailDataUrl ?? "" : "")
    setView(viewResult.status === "fulfilled" ? viewResult.value ?? null : null)
  } catch {
    setThumb("")
    setView(null)
  } finally {
    setCapturing(false)
  }
}
