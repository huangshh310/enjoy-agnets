/**
 * Settings → Agent 进阶沙箱分段。C 端不上品牌名，也不上 Composer 导轨。
 */
import { useQueryClient } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SettingsRow } from "./settings-row"
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
    <section className="settings-card overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            {t("settings.harness.advancedTitle")}
          </h3>
          <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("settings.harness.pageDesc")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary ring-1 ring-border-button-default">
          {t("settings.harness.providerLine")}
        </span>
      </div>
      <div className="divide-y divide-separator-border">
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
      </div>
    </section>
  )
}
