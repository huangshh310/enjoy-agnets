/**
 * 电脑操控卡内嵌的高级坐标逃逸舱。出厂 OFF，打开后每次仍进 Dock。
 */
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"

export function DesktopAdvancedCoordsRow({
  enabled,
  onToggle
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  const t = useT()
  return (
    <div
      className="rounded-xl border border-border-button-default bg-background-primary-default px-3 py-3"
      data-testid="advanced-coords-row"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-body-medium text-text-primary">{t("settings.builtinTools.advancedCoordsTitle")}</h4>
            <span className="rounded-full bg-status-yellow-text/10 px-2 py-0.5 text-caption-2-semibold text-status-yellow-text">
              {t("settings.builtinTools.advancedCoordsBadge")}
            </span>
          </div>
          <p className="mt-1 text-caption-1-medium leading-relaxed text-text-secondary">
            {t("settings.builtinTools.advancedCoordsDesc")}
          </p>
          <p className="mt-1 text-caption-2-medium text-text-tertiary">
            {t("settings.builtinTools.advancedCoordsFoot")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          data-testid="advanced-coords-toggle"
          aria-label={t("settings.builtinTools.advancedCoordsTitle")}
        />
      </div>
    </div>
  )
}
