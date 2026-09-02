/**
 * Settings → Agent：本机 ToolLoop / Harness 运行时与作曲器默认值。
 * 看板展示当前运行时、适配器与默认模型，明细仍走原卡片。
 */
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { RiEqualizer3Line } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
import { SettingsHub } from "./settings-hub"

export function AgentSettings() {
  const t = useT()
  const snapshot = useSettingsSnapshot().data
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const runtime = snapshot?.preferences.codingRuntime ?? "local"
  const harnessId = snapshot?.preferences.harnessId ?? snapshot?.harness.adapterId ?? "auto"
  const adapterLabel = resolveAdapterLabel(harnessId, snapshot, t("common.adapterAuto"))
  const runtimeLabel = runtime === "harness" ? t("common.runtimeHarness") : t("common.runtimeLocal")
  const hasKey = snapshot?.harness.hasProviderKey ?? false

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiEqualizer3Line}
        title={runtime === "harness" ? t("settings.agent.hubHarness") : t("settings.agent.hubLocal")}
        badge={hasKey ? t("common.providersKey") : t("common.noProviderKey")}
        description={t("settings.agent.hubDesc")}
        pulses={[
          { label: t("settings.agent.runtime"), value: runtimeLabel },
          { label: t("settings.agent.adapter"), value: adapterLabel },
          {
            label: t("settings.agent.defaultModel"),
            value: modelLabel || modelId || t("common.unset")
          }
        ]}
      />
      <SettingsHarness />
      <SettingsDefaults />
    </div>
  )
}

function resolveAdapterLabel(
  harnessId: string,
  snapshot: SettingsSnapshot | undefined,
  autoLabel: string
) {
  if (!harnessId || harnessId === "auto") return autoLabel
  const catalogLabel = snapshot?.harness.catalog.find((item) => item.id === harnessId)?.label
  return catalogLabel ?? snapshot?.harness.adapterLabel ?? harnessId
}
