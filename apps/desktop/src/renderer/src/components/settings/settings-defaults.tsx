/**
 * Settings → Agent Defaults：模型选择器 + 探索/执行人话默认项。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { ModelPicker } from "@renderer/components/ai-chat/model-picker"
import {
  modeForSurface,
  rememberDefaultMode,
  surfaceForMode,
  type ComposerSurface
} from "@renderer/components/ai-chat/composer/composer-mode"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { applyActiveModelWrite } from "@renderer/lib/apply-active-model-write"
import { hasIde } from "@renderer/lib/ide"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { SettingsDefaultMode } from "./settings-default-mode"
import { SecretWriteError } from "./secret-write-notice"
import { SettingsCard, SettingsRow } from "./settings-row"
import { useT } from "@renderer/i18n"
import type { SecretWriteErrorCode } from "@renderer/lib/secret-write"

export function SettingsDefaults() {
  const t = useT()
  const queryClient = useQueryClient()
  const models = useChatStore((state) => state.models)
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const defaultMode = useSettingsSnapshot().data?.preferences.defaultMode ?? "agent"
  const setModel = useChatStore((state) => state.setModel)
  const [writeCode, setWriteCode] = useState<SecretWriteErrorCode | null>(null)

  async function onModelChange(model: ModelOption) {
    setModel(model.id, model.label, model.provider, model.reasoningEffort)
    setWriteCode(null)
    if (hasIde()) {
      const outcome = await applyActiveModelWrite({
        providerId: model.providerId,
        modelId: model.id
      })
      if (!outcome.ok) setWriteCode(outcome.code)
    }
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  async function onModeChange(mode: AgentMode) {
    rememberDefaultMode(mode)
    await patchPreferences({ defaultMode: mode })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  function onSurfaceChange(surface: ComposerSurface) {
    void onModeChange(modeForSurface(surface))
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
        {writeCode ? <SecretWriteError className="mt-2" code={writeCode} /> : null}
      </SettingsRow>
      <SettingsDefaultMode surface={surfaceForMode(defaultMode)} onChange={onSurfaceChange} />
    </SettingsCard>
  )
}
