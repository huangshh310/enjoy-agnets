import { useState } from "react"
import type { DesktopComputerUseState } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

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

  const handlePreview = async () => {
    if (!hasIde()) return
    setPreviewing(true)
    try {
      await getIde().builtinTools.previewOverlay()
    } catch (err) {
      console.error("Failed to preview overlay", err)
    } finally {
      setTimeout(() => setPreviewing(false), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body-medium font-semibold text-text-primary">
        {t("settings.builtinTools.desktopSection")}
      </h3>

      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-5">
        <div className="flex flex-col gap-4">
          {/* Computer Use 开关行 */}
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-body-medium text-text-primary">
                {t("settings.builtinTools.computerUseTitle")}
              </p>
              <p className="mt-1 text-caption-1-medium text-text-secondary">
                {t("settings.builtinTools.computerUseDesc")}
              </p>
            </div>
            <Switch
              checked={desktop.enabled}
              onCheckedChange={onToggleComputerUse}
              aria-label={t("settings.builtinTools.computerUseTitle")}
            />
          </div>

          {/* 系统权限与动效配置列表 */}
          {desktop.enabled ? (
            <div className="flex flex-col gap-3.5 pt-1">
              {/* 辅助功能 */}
              <div className="flex items-center justify-between">
                <span className="text-body-medium text-text-primary">
                  {t("settings.builtinTools.accessibility")}
                </span>
                <div className="flex items-center gap-3">
                  {desktop.accessibilityGranted ? (
                    <span className="inline-flex items-center rounded-md bg-notification-success-surface px-2.5 py-0.5 text-caption-2 font-medium text-notification-success-foreground border border-notification-success-border">
                      {t("settings.builtinTools.granted")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-background-tertiary-default px-2.5 py-0.5 text-caption-2 font-medium text-text-tertiary border border-border-button-default">
                      {t("settings.builtinTools.notGranted")}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPermission("accessibility")}
                    className="h-8 rounded-lg px-3 text-caption-1-medium"
                  >
                    {t("settings.builtinTools.openSettings")}
                  </Button>
                </div>
              </div>

              {/* 屏幕录制 */}
              <div className="flex items-center justify-between">
                <span className="text-body-medium text-text-primary">
                  {t("settings.builtinTools.screenCapture")}
                </span>
                <div className="flex items-center gap-3">
                  {desktop.screenCaptureGranted ? (
                    <span className="inline-flex items-center rounded-md bg-notification-success-surface px-2.5 py-0.5 text-caption-2 font-medium text-notification-success-foreground border border-notification-success-border">
                      {t("settings.builtinTools.granted")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-background-tertiary-default px-2.5 py-0.5 text-caption-2 font-medium text-text-tertiary border border-border-button-default">
                      {t("settings.builtinTools.notGranted")}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPermission("screenCapture")}
                    className="h-8 rounded-lg px-3 text-caption-1-medium"
                  >
                    {t("settings.builtinTools.openSettings")}
                  </Button>
                </div>
              </div>

              {/* 屏幕视觉反馈（边框、顶部 HUD 胶囊与点击波纹） */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-4">
                  <span className="text-body-medium text-text-primary">
                    {t("settings.builtinTools.screenVisualsTitle")}
                  </span>
                  <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                    {t("settings.builtinTools.screenVisualsDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewing}
                    className="h-8 rounded-lg px-3 text-caption-1-medium text-text-secondary hover:text-text-primary"
                  >
                    {previewing
                      ? t("settings.builtinTools.previewing")
                      : t("settings.builtinTools.previewVisuals")}
                  </Button>
                  <Switch
                    checked={desktop.screenVisuals ?? true}
                    onCheckedChange={onToggleScreenVisuals}
                    aria-label={t("settings.builtinTools.screenVisualsTitle")}
                  />
                </div>
              </div>

              {/* 底部说明 */}
              <p className="text-caption-1-medium text-text-tertiary leading-relaxed pt-1">
                {t("settings.builtinTools.desktopTip")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
