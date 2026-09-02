/**
 * 侧栏底栏语言切换：中 / EN 分段，与主题开关同排。
 * 写入 zh | en，不走 auto，保证点一下就定语言。
 */
import { cx } from "@/utils/cx"
import { useI18n, type AppLocale } from "@renderer/i18n"
import { usePrefUpdate } from "@renderer/components/settings/settings-pref"

const OPTIONS: AppLocale[] = ["zh", "en"]

export function SidebarLocaleToggle({ collapsed }: { collapsed: boolean }) {
  const { locale, t } = useI18n()
  const { update } = usePrefUpdate()

  function select(next: AppLocale) {
    if (next === locale) return
    void update({ language: next })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label={t("common.localeSwitch")}
        title={t("common.localeSwitch")}
        onClick={() => select(locale === "zh" ? "en" : "zh")}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-theme-toggle-sidebar-background text-caption-2-semibold text-text-secondary hover:text-text-primary"
      >
        {locale === "zh" ? t("common.localeZhShort") : t("common.localeEnShort")}
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label={t("common.localeSwitch")}
      className="inline-flex items-center gap-0.5 rounded-full bg-theme-toggle-sidebar-background p-1"
    >
      {OPTIONS.map((id) => {
        const selected = locale === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            aria-label={id === "zh" ? t("common.chinese") : t("common.english")}
            onClick={() => select(id)}
            className={cx(
              "h-8 min-w-8 cursor-pointer rounded-full px-2 text-caption-2-semibold transition-colors",
              selected
                ? "bg-theme-toggle-sidebar-selected-background text-text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {id === "zh" ? t("common.localeZhShort") : t("common.localeEnShort")}
          </button>
        )
      })}
    </div>
  )
}
