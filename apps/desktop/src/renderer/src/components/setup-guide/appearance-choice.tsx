/**
 * 外观页：浅色 / 深色预览卡点选，强调色仍即时生效。继续才翻页。
 */
import { applyTheme, useThemeMode, type ThemeMode } from "@/components/application/theme/theme-toggle"
import { cx } from "@/utils/cx"
import { THEME_ACCENTS, applyThemeAccent, useThemeAccent } from "@renderer/hooks/use-theme-accent"
import { useT } from "@renderer/i18n"

export function AppearanceChoice() {
  const t = useT()
  const theme = useThemeMode()
  const current = useThemeAccent()
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("settings.setupGuide.appearanceTitle")}>
        <ThemePreview
          mode="light"
          label={t("settings.setupGuide.appearanceLight")}
          selected={theme === "light"}
          onSelect={() => applyTheme("light")}
        />
        <ThemePreview
          mode="dark"
          label={t("settings.setupGuide.appearanceDark")}
          selected={theme === "dark"}
          onSelect={() => applyTheme("dark")}
        />
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

function ThemePreview({
  mode,
  label,
  selected,
  onSelect
}: {
  mode: ThemeMode
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const dark = mode === "dark"
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`appearance-preview-${mode}`}
      onClick={onSelect}
      className={cx(
        "flex cursor-pointer flex-col gap-2 rounded-2xl border p-2 text-left",
        selected ? "border-text-primary ring-1 ring-text-primary ring-inset" : "border-text-primary/10 hover:border-text-primary/25"
      )}
    >
      <span
        aria-hidden
        className={cx(
          "flex h-20 flex-col overflow-hidden rounded-xl border",
          dark ? "border-text-primary bg-text-primary" : "border-border-button-default bg-background-secondary-default"
        )}
      >
        <span className={cx("flex h-5 items-center gap-1 px-2", dark ? "bg-text-primary" : "bg-background-primary-default")}>
          <span className="size-1.5 rounded-full bg-text-tertiary" />
          <span className="size-1.5 rounded-full bg-text-secondary" />
          <span className="size-1.5 rounded-full bg-accent-500" />
        </span>
        <span className="flex min-h-0 flex-1">
          <span className={cx("w-8", dark ? "bg-text-primary/80" : "bg-background-tertiary-default")} />
          <span className="flex flex-1 flex-col justify-center gap-1 px-2">
            <span className={cx("h-1.5 w-10 rounded-full", dark ? "bg-background-primary-default/30" : "bg-text-primary/15")} />
            <span className={cx("h-1.5 w-16 rounded-full", dark ? "bg-background-primary-default/20" : "bg-text-primary/10")} />
          </span>
        </span>
      </span>
      <span className="text-body-2-medium text-text-primary">{label}</span>
    </button>
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
