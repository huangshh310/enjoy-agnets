/**
 * 抽屉「错过后补跑最近一次」。出厂关，文案锁 SoT C。
 */
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"

export function CatchUpToggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const t = useT()
  return (
    <div
      className="rounded-lg border border-border-button-default bg-background-secondary-default px-3 py-2.5"
      data-testid="automation-catch-up-toggle"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption-1-medium text-text-primary">{t("studio.automations.catchUpToggle")}</p>
          <p className="mt-1 text-caption-2-regular leading-relaxed text-text-secondary">
            {t("studio.automations.catchUpToggleHint")}
          </p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={t("studio.automations.catchUpToggle")}
        />
      </div>
      <p className="mt-2 text-caption-2-regular leading-relaxed text-text-secondary">
        {t("studio.automations.catchUpToggleLocal")}
      </p>
      <p className="mt-1 text-caption-2-regular text-text-secondary">{t("studio.automations.catchUpToggleDefault")}</p>
    </div>
  )
}
