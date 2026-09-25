/**
 * 设置「电脑操控」内嵌的始终允许名单。行按钮只写「撤销」。
 * 包含硬编码系统受保护禁区提示，确保用户对安全边界有明确认知。
 */
import type { DesktopAlwaysAllowApp } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { RiShieldCheckLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"

export function DesktopAlwaysAllowList({
  apps,
  onRevoke
}: {
  apps: DesktopAlwaysAllowApp[]
  onRevoke: (appKey: string) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2" data-testid="desktop-always-allow">
      {/* 系统受保护禁区安全声明 */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border-button-default bg-background-secondary-default/50 px-3.5 py-2.5">
        <RiShieldCheckLine className="size-4 shrink-0 text-state-success-text mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-caption-1-semibold text-text-primary">
            {t("settings.builtinTools.protectedSurfacesTitle")}
          </p>
          <p className="mt-0.5 text-caption-2-medium leading-relaxed text-text-secondary">
            {t("settings.builtinTools.protectedSurfacesDesc")}
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-body-medium text-text-primary">{t("settings.builtinTools.alwaysAllowTitle")}</h4>
        <p className="mt-0.5 text-caption-1-medium leading-relaxed text-text-secondary">
          {t("settings.builtinTools.alwaysAllowDesc")}
        </p>
      </div>

      {apps.length === 0 ? <AlwaysAllowEmpty /> : <AlwaysAllowRows apps={apps} onRevoke={onRevoke} />}

      <p className="text-caption-2-medium leading-relaxed text-text-tertiary pt-0.5">
        {t("settings.builtinTools.alwaysAllowFootnote")}
      </p>
    </div>
  )
}

function AlwaysAllowEmpty() {
  const t = useT()
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/30 px-3.5 py-3 text-caption-1-medium text-text-tertiary"
      data-testid="desktop-always-allow-empty"
    >
      <span className="font-medium text-text-secondary">{t("settings.builtinTools.alwaysAllowEmpty")}</span>
      <span className="text-caption-2-medium text-text-tertiary/80">— {t("settings.builtinTools.alwaysAllowEmptyHint")}</span>
    </div>
  )
}

function AlwaysAllowRows({
  apps,
  onRevoke
}: {
  apps: DesktopAlwaysAllowApp[]
  onRevoke: (appKey: string) => void
}) {
  const t = useT()
  return (
    <ul className="flex flex-col gap-2">
      {apps.map((app) => (
        <li
          key={app.appKey}
          className="flex items-center gap-3 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2"
          data-testid="desktop-always-allow-row"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-tertiary-default text-caption-2-semibold text-text-primary ring-1 ring-border-button-default">
            {initialOf(app.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption-1-medium text-text-primary">{app.displayName}</p>
            <p className="truncate font-mono text-caption-2 text-text-tertiary">{app.appKey}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            data-testid="desktop-always-allow-revoke"
            onClick={() => onRevoke(app.appKey)}
            className="h-7 shrink-0 rounded-lg px-2.5 text-caption-2-medium"
          >
            {t("settings.builtinTools.alwaysAllowRevoke")}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function initialOf(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 1) : "?"
}
