/**
 * 侧栏语言切换：中 / A 细环分段，与明暗开关同形。
 */
import { GlyphSegmented } from "@/components/application/theme/glyph-segmented"
import { usePrefUpdate } from "@renderer/components/settings/settings-pref"
import { useI18n, type AppLocale } from "@renderer/i18n"
import { EnGlyph, ZhGlyph } from "./locale-glyphs"

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
        className="flex size-9 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-foreground-icon-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {locale === "zh" ? <ZhGlyph /> : <EnGlyph />}
      </button>
    )
  }

  return (
    <GlyphSegmented
      value={locale}
      ariaLabel={t("common.localeSwitch")}
      options={[
        { id: "zh", label: t("common.chinese"), glyph: <ZhGlyph /> },
        { id: "en", label: t("common.english"), glyph: <EnGlyph /> }
      ]}
      onSelect={(id) => select(id as AppLocale)}
    />
  )
}
