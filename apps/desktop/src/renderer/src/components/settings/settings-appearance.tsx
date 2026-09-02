/**
 * Settings → Appearance：手动亮/暗主题。
 * 产品不跟随系统主题；看板只陈述这一事实，不伪造字号或密度控件。
 */
import { RiPaletteLine } from "@remixicon/react"
import { ThemeToggle, useThemeMode } from "@/components/application/theme/theme-toggle"
import { useT } from "@renderer/i18n"
import { SettingsHub } from "./settings-hub"
import { SettingsCard, SettingsRow } from "./settings-row"

export function AppearanceSettings() {
  const t = useT()
  const theme = useThemeMode()
  const label = theme === "dark" ? t("common.dark") : t("common.light")

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiPaletteLine}
        title={t("settings.appearance.hubTitle")}
        badge={label}
        description={t("settings.appearance.hubDesc")}
        pulses={[
          { label: t("settings.appearance.activeTheme"), value: label },
          { label: t("settings.appearance.osSync"), value: t("common.never") },
          { label: t("settings.appearance.accent"), value: t("common.signalBlue") }
        ]}
      />

      <SettingsCard title={t("settings.appearance.cardTitle")}>
        <SettingsRow title={t("settings.appearance.hubTitle")} description={t("settings.appearance.hubDesc")}>
          <ThemeToggle appearance="sidebar-segmented" />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
