/**
 * Settings → Agent：本机 ToolLoop / Harness 运行时与作曲器默认值。
 * 看板展示当前运行时、适配器与默认模型，明细仍走原卡片。
 */
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { RiEqualizer3Line } from "@remixicon/react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
import { SettingsHub } from "./settings-hub"

export function AgentSettings() {
  const snapshot = useSettingsSnapshot().data
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const runtime = snapshot?.preferences.codingRuntime ?? "local"
  const harnessId = snapshot?.preferences.harnessId ?? snapshot?.harness.adapterId ?? "auto"
  const adapterLabel = resolveAdapterLabel(harnessId, snapshot)
  const runtimeLabel = runtime === "harness" ? "Harness (adapter)" : "Local (ToolLoop)"
  const hasKey = snapshot?.harness.hasProviderKey ?? false

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiEqualizer3Line}
        title={runtime === "harness" ? "Harness runtime" : "Local ToolLoop"}
        badge={hasKey ? "Providers key" : "No provider key"}
        description="Coding runtime, provider adapter, and the same model/mode defaults as the composer."
        pulses={[
          { label: "Runtime", value: runtimeLabel },
          { label: "Adapter", value: adapterLabel },
          { label: "Default model", value: modelLabel || modelId || "Unset" }
        ]}
      />
      <SettingsHarness />
      <SettingsDefaults />
    </div>
  )
}

function resolveAdapterLabel(harnessId: string, snapshot: SettingsSnapshot | undefined) {
  if (!harnessId || harnessId === "auto") return "Auto from Provider"
  const catalogLabel = snapshot?.harness.catalog.find((item) => item.id === harnessId)?.label
  return catalogLabel ?? snapshot?.harness.adapterLabel ?? harnessId
}
