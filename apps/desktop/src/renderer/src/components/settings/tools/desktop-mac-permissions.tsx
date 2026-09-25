/**
 * macOS 辅助功能 / 屏幕录制。已授权只认医生看到的 helper，不认宿主 Electron。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

type PermissionCopyKey =
  | "settings.builtinTools.accessibility"
  | "settings.builtinTools.accessibilityDesc"
  | "settings.builtinTools.screenCapture"
  | "settings.builtinTools.screenCaptureDesc"

export function DesktopMacPermissions({
  session,
  show,
  accessibilityGranted,
  screenCaptureGranted,
  onOpenPermission
}: {
  session?: string
  show: boolean
  accessibilityGranted: boolean
  screenCaptureGranted: boolean
  onOpenPermission: (permission: "accessibility" | "screenCapture") => void
}) {
  if (!show || (session && session !== "macos")) return null
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
      <PermissionRow
        labelKey="settings.builtinTools.accessibility"
        descKey="settings.builtinTools.accessibilityDesc"
        granted={accessibilityGranted}
        onOpen={() => onOpenPermission("accessibility")}
      />
      <PermissionRow
        labelKey="settings.builtinTools.screenCapture"
        descKey="settings.builtinTools.screenCaptureDesc"
        granted={screenCaptureGranted}
        onOpen={() => onOpenPermission("screenCapture")}
      />
      <p className="text-caption-2-medium leading-relaxed text-text-tertiary">
        {t("settings.builtinTools.permissionsSilentNote")}
      </p>
    </div>
  )
}

function PermissionRow({
  labelKey,
  descKey,
  granted,
  onOpen
}: {
  labelKey: PermissionCopyKey
  descKey: PermissionCopyKey
  granted: boolean
  onOpen: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <span className="text-body-medium text-text-primary">{t(labelKey)}</span>
        <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t(descKey)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={
            granted
              ? "inline-flex items-center rounded-md bg-state-success-base px-2.5 py-0.5 text-caption-2 font-medium text-state-success-text ring-1 ring-state-success-text/20"
              : "inline-flex items-center rounded-md bg-background-tertiary-default px-2.5 py-0.5 text-caption-2 font-medium text-text-tertiary ring-1 ring-border-button-default"
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
