/**
 * macOS 辅助功能 / 屏幕录制两行。其它桌面会话不渲染。
 */
import type { DesktopComputerUseState } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function DesktopMacPermissions({
  desktop,
  onOpenPermission
}: {
  desktop: DesktopComputerUseState
  onOpenPermission: (permission: "accessibility" | "screenCapture") => void
}) {
  if (desktop.session && desktop.session !== "macos") return null
  return (
    <>
      <PermissionRow
        label="settings.builtinTools.accessibility"
        granted={desktop.accessibilityGranted}
        onOpen={() => onOpenPermission("accessibility")}
      />
      <PermissionRow
        label="settings.builtinTools.screenCapture"
        granted={desktop.screenCaptureGranted}
        onOpen={() => onOpenPermission("screenCapture")}
      />
    </>
  )
}

function PermissionRow({
  label,
  granted,
  onOpen
}: {
  label: string
  granted: boolean
  onOpen: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-medium text-text-primary">{t(label)}</span>
      <div className="flex items-center gap-3">
        <span
          className={
            granted
              ? "inline-flex items-center rounded-md border border-notification-success-border bg-notification-success-surface px-2.5 py-0.5 text-caption-2 font-medium text-notification-success-foreground"
              : "inline-flex items-center rounded-md border border-border-button-default bg-background-tertiary-default px-2.5 py-0.5 text-caption-2 font-medium text-text-tertiary"
          }
        >
          {t(granted ? "settings.builtinTools.granted" : "settings.builtinTools.notGranted")}
        </span>
        <Button variant="outline" size="sm" onClick={onOpen} className="h-8 rounded-lg px-3 text-caption-1-medium">
          {t("settings.builtinTools.openSettings")}
        </Button>
      </div>
    </div>
  )
}
