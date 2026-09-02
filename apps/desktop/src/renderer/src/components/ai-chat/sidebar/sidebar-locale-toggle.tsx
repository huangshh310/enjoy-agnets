/**
 * 侧栏语言切换：与明暗开关同一手绘胶囊，圆面上印 中 / A。
 */
import { usePrefUpdate } from "@renderer/components/settings/settings-pref"
import { useI18n, type AppLocale } from "@renderer/i18n"
import { EnGlyph, ZhGlyph } from "./locale-glyphs"
import "./locale-switch.css"

export function SidebarLocaleToggle({ collapsed }: { collapsed: boolean }) {
  const { locale, t } = useI18n()
  const { update } = usePrefUpdate()
  const english = locale === "en"

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
        onClick={() => select(english ? "zh" : "en")}
        className="flex size-9 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {english ? <EnGlyph /> : <ZhGlyph />}
      </button>
    )
  }

  return (
    <label
      className="locale-switch"
      onClick={(event) => {
        event.preventDefault()
        select(english ? "zh" : "en")
      }}
    >
      <LocaleFilters />
      <input
        type="checkbox"
        className="locale-switch__checkbox"
        checked={english}
        readOnly
        aria-label={t("common.localeSwitch")}
      />
      <div className="locale-switch__container" title={english ? t("common.english") : t("common.chinese")}>
        <div className="locale-switch__clouds" />
        <div className="locale-switch__circle-container">
          <div className="locale-switch__sun-moon-container">
            <span className="locale-switch__glyph">
              <ZhGlyph />
            </span>
            <div className="locale-switch__moon">
              <span className="locale-switch__glyph">
                <EnGlyph />
              </span>
            </div>
          </div>
        </div>
      </div>
    </label>
  )
}

function LocaleFilters() {
  return (
    <svg className="locale-switch__filters" aria-hidden="true">
      <defs>
        <filter id="locale-switch-sketchy" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="turbulence" baseFrequency="0.035 0.042" numOctaves={4} result="noise" seed={42} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="locale-switch-sketchy-sm" x="-18%" y="-18%" width="136%" height="136%">
          <feTurbulence type="turbulence" baseFrequency="0.06" numOctaves={3} result="noise" seed={7} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
