/**
 * 画面：指针色、线程预览、蓝边。三件事一张卡，预览关掉时尺寸不可点。
 */
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SettingsCard, SettingsRow } from "../settings-row"

type Pointer = "stock" | "custom"
type PreviewSize = "compact" | "large"
type PrefPatch = {
  computerUsePointer?: Pointer
  computerUsePreview?: boolean
  computerUsePreviewSize?: PreviewSize
}

export function ComputerUsePreferences({
  pointer,
  preview,
  size,
  visualsOn,
  canPreviewChrome,
  onSave,
  onToggleVisuals
}: {
  pointer: Pointer
  preview: boolean
  size: PreviewSize
  visualsOn: boolean
  canPreviewChrome: boolean
  onSave: (patch: PrefPatch) => void
  onToggleVisuals: (enabled: boolean) => void
}) {
  const t = useT()
  const [previewing, setPreviewing] = useState(false)
  return (
    <SettingsCard title={t("settings.computerUse.appearance")}>
      <SettingsRow title={t("settings.computerUse.pointer")} description={t("settings.computerUse.pointerDesc")}>
        <span className="flex rounded-lg bg-background-secondary-default p-0.5">
          <Choice active={pointer === "stock"} label={t("settings.computerUse.pointerStock")} onClick={() => onSave({ computerUsePointer: "stock" })} />
          <Choice active={pointer === "custom"} label={t("settings.computerUse.pointerCustom")} onClick={() => onSave({ computerUsePointer: "custom" })} />
        </span>
      </SettingsRow>
      <SettingsRow title={t("settings.computerUse.preview")} description={t("settings.computerUse.previewDesc")}>
        <span className="flex items-center gap-2">
          <Choice active={size === "compact"} disabled={!preview} label={t("settings.computerUse.compact")} onClick={() => onSave({ computerUsePreviewSize: "compact" })} />
          <Choice active={size === "large"} disabled={!preview} label={t("settings.computerUse.large")} onClick={() => onSave({ computerUsePreviewSize: "large" })} />
          <Switch checked={preview} onCheckedChange={(value) => onSave({ computerUsePreview: value })} aria-label={t("settings.computerUse.preview")} />
        </span>
      </SettingsRow>
      <SettingsRow title={t("settings.builtinTools.screenVisualsTitle")} description={t("settings.builtinTools.screenVisualsDesc")}>
        <span className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-3 text-caption-1-medium"
            disabled={previewing || !canPreviewChrome}
            title={canPreviewChrome ? undefined : t("settings.computerUse.previewNeedsSwitch")}
            onClick={() => void previewOverlay(setPreviewing)}
          >
            {previewing ? t("settings.builtinTools.previewing") : t("settings.builtinTools.previewVisuals")}
          </Button>
          <Switch checked={visualsOn} onCheckedChange={onToggleVisuals} aria-label={t("settings.builtinTools.screenVisualsTitle")} />
        </span>
      </SettingsRow>
    </SettingsCard>
  )
}

function Choice({
  active,
  disabled,
  label,
  onClick
}: {
  active: boolean
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-accent-500/10 px-2.5 py-1 text-caption-1-medium text-accent-500 disabled:opacity-40"
          : "rounded-md px-2.5 py-1 text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover disabled:opacity-40"
      }
    >
      {label}
    </button>
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
