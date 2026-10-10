/**
 * 外观页：亮暗居中，下面是五色强调色。改动立刻作用在后面的窗口上。
 */
import { ThemeToggle } from "@/components/application/theme/theme-toggle"
import { cx } from "@/utils/cx"
import { THEME_ACCENTS, applyThemeAccent, useThemeAccent } from "@renderer/hooks/use-theme-accent"
import { useT } from "@renderer/i18n"

export function AppearanceChoice() {
  const t = useT()
  const current = useThemeAccent()
  return (
    <div className="flex flex-col gap-5">
      <div className="px-24">
        <ThemeToggle appearance="sidebar-segmented" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-body-2-medium font-medium text-text-primary/80">{t("settings.setupGuide.accentLabel")}</span>
          <span className="text-caption-1-regular text-text-tertiary">{t("settings.setupGuide.accentBoth")}</span>
        </div>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t("settings.setupGuide.accentLabel")}>
          {THEME_ACCENTS.map((item) => (
            <AccentCell
              key={item.id}
              name={t(item.nameKey)}
              color={item.color}
              selected={item.id === current}
              onSelect={() => applyThemeAccent(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AccentCell({
  name,
  color,
  selected,
  onSelect
}: {
  name: string
  color: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-xl border bg-background-primary-default px-2.5 text-left",
        selected ? "border-text-primary ring-1 ring-text-primary ring-inset" : "border-text-primary/10 hover:border-text-primary/25"
      )}
    >
      <span aria-hidden className="size-[18px] shrink-0 rounded-full border border-text-primary/25" style={{ backgroundColor: color }} />
      <span className={cx("truncate text-body-2-medium text-text-primary", selected && "font-medium")}>{name}</span>
    </button>
  )
}
