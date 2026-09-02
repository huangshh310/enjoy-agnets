/**
 * Settings → Appearance：手动亮/暗主题。
 * 产品不跟随系统主题；看板只陈述这一事实，不伪造字号或密度控件。
 */
import { RiPaletteLine } from "@remixicon/react"
import { ThemeToggle, useThemeMode } from "@/components/application/theme/theme-toggle"
import { SettingsHub } from "./settings-hub"
import { SettingsCard, SettingsRow } from "./settings-row"

export function AppearanceSettings() {
  const theme = useThemeMode()
  const label = theme === "dark" ? "Dark" : "Light"

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiPaletteLine}
        title="Color mode"
        badge={label}
        description="Manual light or dark. Enjoy Agents does not follow the operating system theme."
        pulses={[
          { label: "Active theme", value: label },
          { label: "OS sync", value: "Never" },
          { label: "Accent", value: "Signal Blue" }
        ]}
      />

      <SettingsCard title="Theme">
        <SettingsRow
          title="Color mode"
          description="Manual light or dark. Enjoy Agents does not follow the operating system theme."
        >
          <ThemeToggle appearance="sidebar-segmented" />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
