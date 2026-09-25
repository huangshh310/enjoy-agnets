/**
 * 设置「始终允许的应用」：名单 + 撤销。只清持久簿，不碰本会话表。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function DesktopAlwaysAllowBook({
  appKeys,
  onRevoke
}: {
  appKeys: string[]
  onRevoke: (appKey: string) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2" data-testid="desktop-always-allow-book">
      <div>
        <p className="text-body-medium text-text-primary">{t("settings.builtinTools.alwaysAllowTitle")}</p>
        <p className="mt-0.5 text-caption-1-medium leading-relaxed text-text-secondary">
          {t("settings.builtinTools.alwaysAllowDesc")}
        </p>
      </div>
      {appKeys.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default px-3 py-3"
          data-testid="desktop-always-allow-empty"
        >
          <p className="text-caption-1-medium text-text-primary">{t("settings.builtinTools.alwaysAllowEmpty")}</p>
          <p className="mt-1 text-caption-2-medium text-text-tertiary">{t("settings.builtinTools.alwaysAllowEmptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {appKeys.map((appKey) => (
            <li
              key={appKey}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2"
              data-testid="desktop-always-allow-row"
            >
              <div className="min-w-0">
                <p className="truncate text-caption-1-medium text-text-primary">{appKey}</p>
                <p className="truncate text-caption-2-medium text-text-tertiary">{digestAppKey(appKey)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-caption-1-medium"
                data-testid="desktop-always-allow-revoke"
                onClick={() => onRevoke(appKey)}
              >
                {t("settings.builtinTools.alwaysAllowRevoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-caption-2-medium leading-relaxed text-text-tertiary">
        {t("settings.builtinTools.alwaysAllowFootnote")}
      </p>
    </div>
  )
}

function digestAppKey(appKey: string): string {
  if (appKey.length <= 36) return appKey
  return `${appKey.slice(0, 16)}…${appKey.slice(-10)}`
}
