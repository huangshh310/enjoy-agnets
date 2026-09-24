/**
 * 设置里再打开一次启动引导。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { SettingsCard, SettingsRow } from "@renderer/components/settings/settings-row"
import { replaySetupGuide } from "./setup-guide-store"

export function SetupGuideReplay() {
  const t = useT()
  return (
    <SettingsCard title={t("settings.setupGuide.replayTitle")}>
      <SettingsRow title={t("settings.setupGuide.replay")} description={t("settings.setupGuide.replayDesc")}>
        <Button type="button" variant="outline" onClick={replaySetupGuide}>
          {t("settings.setupGuide.replay")}
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}
