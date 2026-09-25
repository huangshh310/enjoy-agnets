import { useEffect, useState } from "react"
import type { DesktopComputerUseState } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { DesktopMacPermissions } from "./desktop-mac-permissions"

export function DesktopToolsCard({
  desktop,
  onToggleComputerUse,
  onToggleScreenVisuals,
  onOpenPermission
}: {
  desktop: DesktopComputerUseState
  onToggleComputerUse: (enabled: boolean) => void
  onToggleScreenVisuals?: (enabled: boolean) => void
  onOpenPermission: (permission: "accessibility" | "screenCapture") => void
}) {
  const t = useT()
  const [previewing, setPreviewing] = useState(false)
  const [doctorLine, setDoctorLine] = useState("")
  const hint = platformHintKey(desktop.session)

  useEffect(() => {
    if (!desktop.enabled || !hasIde()) return
    void getIde()
      .builtinTools.desktopDoctor()
      .then((report: { line?: string }) => setDoctorLine(report.line ?? ""))
      .catch(() => setDoctorLine(""))
  }, [desktop.enabled])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.builtinTools.desktopSection")}</h3>
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5">
        <div className="flex flex-col gap-4">
          <SwitchRow
            title={t("settings.builtinTools.computerUseTitle")}
            desc={t("settings.builtinTools.computerUseDesc")}
            checked={desktop.enabled}
            onChange={onToggleComputerUse}
          />
          {desktop.enabled ? (
            <div className="flex flex-col gap-3.5 pt-1">
              {doctorLine ? <p className="text-caption-1-medium text-text-secondary leading-relaxed">{doctorLine}</p> : null}
              {hint ? <p className="text-caption-1-medium text-text-secondary leading-relaxed">{t(hint)}</p> : null}
              <DesktopMacPermissions desktop={desktop} onOpenPermission={onOpenPermission} />
              <VisualsRow
                previewing={previewing}
                checked={desktop.screenVisuals ?? true}
                onPreview={() => void previewOverlay(setPreviewing)}
                onToggle={onToggleScreenVisuals}
              />
              <p className="pt-1 text-caption-1-medium leading-relaxed text-text-tertiary">{t("settings.builtinTools.desktopTip")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SwitchRow({
  title,
  desc,
  checked,
  onChange
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        <p className="mt-1 text-caption-1-medium text-text-secondary">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
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

function platformHintKey(session?: string) {
  if (session === "windows") return "settings.builtinTools.platformHintWindows" as const
  if (session === "x11") return "settings.builtinTools.platformHintX11" as const
  if (session === "wayland") return "settings.builtinTools.platformHintWayland" as const
  if (session === "none") return "settings.builtinTools.platformHintNone" as const
  return null
}
