/**
 * Settings → Agent Defaults：与输入框同一套 ModelPicker / 运行模式胶囊。
 */
import { useQueryClient } from "@tanstack/react-query"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { ExecutionModeMenu } from "@renderer/components/ai-chat/execution-mode-menu"
import { ModelPicker } from "@renderer/components/ai-chat/model-picker"
import { applySettingsSnapshot } from "@renderer/hooks/use-agent-session"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { SettingsCard, SettingsRow } from "./settings-row"
import { useT } from "@renderer/i18n"

export function SettingsDefaults() {
  const t = useT()
  const queryClient = useQueryClient()
  const models = useChatStore((state) => state.models)
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const defaultMode = useSettingsSnapshot().data?.preferences.defaultMode ?? "agent"
  const setModel = useChatStore((state) => state.setModel)
  const setMode = useChatStore((state) => state.setMode)

  async function onModelChange(model: ModelOption) {
    setModel(model.id, model.label, model.provider, model.reasoningEffort)
    if (hasIde()) {
      try {
        const snapshot = (await getIde().settings.setActiveModel({
          providerId: model.providerId,
          modelId: model.id
        })) as SettingsSnapshot
        await applySettingsSnapshot(snapshot)
      } catch {
        await getIde().settings.setDefaultModel({ modelId: model.id })
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  async function onModeChange(mode: AgentMode) {
    setMode(mode)
    await patchPreferences({ defaultMode: mode })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsCard title={t("settings.defaults.title")}>
      <SettingsRow title={t("settings.defaults.model")} description={t("settings.defaults.modelDesc")}>
        <ModelPicker
          modelId={modelId}
          modelLabel={modelLabel || modelId}
          models={models}
          onModelChange={onModelChange}
        />
      </SettingsRow>
      <SettingsRow title={t("settings.defaults.mode")} description={t("settings.defaults.modeDesc")}>
        <ExecutionModeMenu mode={defaultMode} onChange={(mode) => void onModeChange(mode)} align="end" />
      </SettingsRow>
    </SettingsCard>
  )
}
