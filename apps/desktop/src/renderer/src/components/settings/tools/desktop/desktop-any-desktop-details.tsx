/**
 * 高级「本会话任意桌面」：默认关、折叠、警示。未开时 UI 不提供裸 desktop_act 放行。
 * 无焦点会话时开关禁用：main 无 sessionId 不写表，UI 不得看起来能开。
 */
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"

export function DesktopAnyDesktopDetails({
  enabled,
  onToggle,
  sessionId
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  sessionId?: string | null
}) {
  const t = useT()
  const hasFocusedSession = Boolean(sessionId?.trim())
  return (
    <details className="group rounded-xl border border-border-button-default bg-background-secondary-default/30 transition-colors">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-caption-1-medium font-medium text-text-primary hover:text-text-primary">
        {t("settings.builtinTools.anyDesktopSummary")}
      </summary>
      <div className="space-y-3 border-t border-border-button-default/60 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-medium text-text-primary">{t("settings.builtinTools.anyDesktopTitle")}</p>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("settings.builtinTools.anyDesktopDesc")}</p>
          </div>
          <Switch
            checked={hasFocusedSession && enabled}
            onCheckedChange={onToggle}
            disabled={!hasFocusedSession}
            aria-label={t("settings.builtinTools.anyDesktopTitle")}
          />
        </div>
        {hasFocusedSession ? null : (
          <p className="text-caption-1-medium text-text-tertiary">{t("settings.builtinTools.anyDesktopNeedSession")}</p>
        )}
        <p className="rounded-lg border border-border-button-default bg-background-primary-default px-3 py-2 text-caption-1-medium leading-relaxed text-text-secondary">
          {t("settings.builtinTools.anyDesktopWarn")}
        </p>
      </div>
    </details>
  )
}
