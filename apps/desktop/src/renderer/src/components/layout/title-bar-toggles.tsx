/**
 * 标题栏辅助开关：昼/夜与多语言，精致现代 24px 极简控件，对齐窗口控制按钮。
 */
import { RiMoonLine, RiSunLine, RiTranslate2 } from "@remixicon/react"
import { applyThemeWithTransition, useThemeMode } from "@/components/application/theme/theme-toggle"
import { useI18n, type AppLocale } from "@renderer/i18n"
import { usePrefUpdate } from "@renderer/components/settings/settings-pref"

export function TitleBarToggles() {
  const theme = useThemeMode()
  const dark = theme === "dark"
  const { locale, t } = useI18n()
  const { update } = usePrefUpdate()

  function handleToggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const pointerOrigin =
      event.clientX === 0 && event.clientY === 0 ? null : { x: event.clientX, y: event.clientY }
    void applyThemeWithTransition(dark ? "light" : "dark", {
      origin: pointerOrigin,
      element: event.currentTarget,
      duration: 820
    })
  }

  function handleToggleLocale() {
    const next: AppLocale = locale === "zh" ? "en" : "zh"
    void update({ language: next })
  }

  return (
    <div
      className="mr-1 flex items-center gap-1 [app-region:no-drag]"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {/* 极简深浅色主题切换：24px 见方，与窗口最小化/关闭按钮高度严格一致 */}
      <button
        type="button"
        onClick={handleToggleTheme}
        aria-label={dark ? t("common.light") : t("common.dark")}
        title={dark ? t("common.light") : t("common.dark")}
        className="group flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-icon-secondary outline-none transition-all duration-200 hover:bg-background-secondary-hover hover:text-text-primary active:scale-90 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {dark ? (
          <RiSunLine className="size-3.5 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <RiMoonLine className="size-3.5 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </button>

      {/* 极简语言微胶囊：24px 高度，精准水平对齐 */}
      <button
        type="button"
        onClick={handleToggleLocale}
        aria-label={t("common.localeSwitch")}
        title={locale === "zh" ? "Switch to English" : "切换为中文"}
        className="flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 text-caption-2-medium text-foreground-icon-secondary outline-none transition-all duration-150 hover:bg-background-secondary-hover hover:text-text-primary active:scale-90 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiTranslate2 className="size-3 text-text-tertiary" />
        <span className="font-semibold tracking-tight">{locale === "zh" ? "中" : "EN"}</span>
      </button>
    </div>
  )
}
