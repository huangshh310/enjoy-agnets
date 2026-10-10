/**
 * 外观页强调色选择：5 款主题色（Signal Blue, Terminal Green, Claude Amber, Cosmic Purple, Graphite Slate）
 */
import { cx } from "@/utils/cx"
import { THEME_ACCENTS, applyThemeAccent, useThemeAccent } from "@renderer/hooks/use-theme-accent"
import { useT } from "@renderer/i18n"
import { RiCheckLine } from "@remixicon/react"

export function AppearanceAccentPicker() {
  const t = useT()
  const currentAccent = useThemeAccent()

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4" role="radiogroup" aria-label="主题强调色">
      {THEME_ACCENTS.map((item) => {
        const isSelected = currentAccent === item.id

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => applyThemeAccent(item.id)}
            className={cx(
              "group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left transition-all duration-150 cursor-pointer select-none",
              isSelected
                ? "border-accent-500/50 bg-background-primary-default shadow-xs ring-1 ring-accent-500/30"
                : "border-separator-border/80 bg-background-secondary-default/40 hover:border-separator-border hover:bg-background-secondary-default/80"
            )}
          >
            <span
              className="relative flex size-4.5 shrink-0 items-center justify-center rounded-full shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: item.color }}
            >
              {isSelected ? (
                <RiCheckLine className="size-3 text-white stroke-2" />
              ) : null}
            </span>
            <span
              className={cx(
                "text-caption-1-medium transition-colors",
                isSelected ? "font-semibold text-text-primary" : "text-text-secondary group-hover:text-text-primary"
              )}
            >
              {t(item.nameKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
