/**
 * Settings → Appearance：亮暗颜色模式与全应用界面皮肤。
 */
import { RiPaletteLine } from "@remixicon/react"
import { ThemeToggle, useThemeMode } from "@/components/application/theme/theme-toggle"
import { useThemeSkin } from "@renderer/hooks/use-theme-skin"
import { THEME_ACCENTS, useThemeAccent } from "@renderer/hooks/use-theme-accent"
import { useT } from "@renderer/i18n"
import { AppearanceSkinPicker } from "./appearance/appearance-skin-picker"
import { appearanceSkinLabel } from "./appearance/appearance-skin-options"
import { AppearanceAccentPicker } from "./appearance/appearance-accent-picker"
import { AppearanceTypographyCard } from "./appearance/appearance-typography-card"
import { SettingsHub } from "./settings-hub"
import { SettingsCard, SettingsRow } from "./settings-row"

export function AppearanceSettings() {
  const t = useT()
  const theme = useThemeMode()
  const skin = useThemeSkin()
  const accent = useThemeAccent()
  const currentAccent = THEME_ACCENTS.find((a) => a.id === accent) ?? THEME_ACCENTS[0]
  const themeLabel = theme === "dark" ? t("common.dark") : t("common.light")
  const skinLabel = appearanceSkinLabel(skin, t)

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiPaletteLine}
        title={t("settings.appearance.hubTitle")}
        badge={themeLabel}
        description={t("settings.appearance.hubDesc")}
        pulses={[
          { label: t("settings.appearance.activeTheme"), value: themeLabel },
          { label: t("settings.appearance.activeSkin"), value: skinLabel },
          { label: t("settings.appearance.osSync"), value: t("common.never") },
          { label: t("settings.appearance.accent"), value: t(currentAccent.nameKey) }
        ]}
      />
      <SettingsCard title={t("settings.appearance.cardTitle")}>
        <SettingsRow title={t("settings.appearance.hubTitle")} description={t("settings.appearance.hubDesc")}>
          <ThemeToggle appearance="sidebar-segmented" />
        </SettingsRow>
      </SettingsCard>
      <SettingsCard title={t("settings.appearance.accent")}>
        <AppearanceAccentPicker />
      </SettingsCard>
      <SettingsCard title={t("settings.appearance.skinTitle")}>
        <AppearanceSkinPicker />
      </SettingsCard>
      <AppearanceTypographyCard />
    </div>
  )
}
