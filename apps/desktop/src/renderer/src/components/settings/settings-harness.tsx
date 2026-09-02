/**
 * Settings → Agent：本机 ToolLoop 与按 Provider 选择的 Harness 插件。
 */
import { useQueryClient } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SettingsCard, SettingsRow } from "./settings-row"
import { useT } from "@renderer/i18n"
import { SettingsHarnessCredentials } from "./settings-harness-credentials"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"

export function SettingsHarness() {
  const t = useT()
  const queryClient = useQueryClient()
  const snapshot = useSettingsSnapshot().data
  const runtime = snapshot?.preferences.codingRuntime ?? "local"
  const harnessId = snapshot?.preferences.harnessId ?? snapshot?.harness.adapterId ?? "auto"

  async function persist(patch: { codingRuntime?: "local" | "harness"; harnessId?: string }) {
    await patchPreferences(patch)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsCard title={t("settings.harness.cardTitle")}>
      <SettingsRow title={t("settings.agent.runtime")} description={t("settings.harness.runtimeDesc")}>
        <Select value={runtime} onValueChange={(value) => void persist({ codingRuntime: value as typeof runtime })}>
          <SelectTrigger className="min-w-[12rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">{t("common.runtimeLocal")}</SelectItem>
            <SelectItem value="harness">{t("common.runtimeHarness")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow title={t("settings.agent.adapter")} description={t("settings.harness.adapterDesc")}>
        <Select
          value={harnessId || "auto"}
          onValueChange={(value) => void persist({ harnessId: value === "auto" ? "" : value })}
        >
          <SelectTrigger className="min-w-[12rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("common.adapterAuto")}</SelectItem>
            {(snapshot?.harness.catalog ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
                {item.comingSoon ? t("settings.harness.soon") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsHarnessCredentials />
    </SettingsCard>
  )
}
