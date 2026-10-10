/**
 * 设置快照落到 Composer 模型：有密钥没模型时留空，不要用目录第一项顶上。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { composerModelPatch } from "../lib/session-model.ts"
import { settingsShouldLeaveModelEmpty } from "./composer-leave-model-empty.ts"
import { pickActiveModel } from "./pick-active-model.ts"

export type SettingsComposerModel = {
  id: string
  label: string
  provider?: string
  reasoningEffort?: string
}

export function applyComposerModelFromSettings(input: {
  sessionId: string | null
  sessionModels: Record<string, string>
  preferredModelId: string
  reasoningEffort?: string
  defaultModelId?: string
  readySnap?: ChatReadiness
  models: SettingsComposerModel[]
  setModel: (id: string, label?: string, provider?: string, effort?: string) => void
}): void {
  const preferredModel = input.preferredModelId || input.defaultModelId || ""
  const sessionPatch = input.sessionId
    ? composerModelPatch({
        sessionId: input.sessionId,
        sessionModels: input.sessionModels,
        preferredModelId: preferredModel,
        models: input.models
      })
    : { modelId: preferredModel, modelLabel: "" }
  const selected = pickActiveModel(input.models, sessionPatch.modelId, input.defaultModelId)
  const sessionModelId = input.sessionId ? input.sessionModels[input.sessionId] : undefined
  if (
    settingsShouldLeaveModelEmpty({
      hasEnjoySecret: input.readySnap?.hasEnjoySecret,
      profileId: input.readySnap?.defaultRoute?.profileId,
      routeModelId: input.readySnap?.defaultRoute?.modelId,
      defaultModelId: input.defaultModelId,
      preferredModelId: input.preferredModelId,
      sessionModelId
    })
  ) {
    input.setModel("", "")
    return
  }
  if (selected) {
    input.setModel(
      selected.id,
      selected.label,
      selected.provider,
      input.reasoningEffort ?? selected.reasoningEffort
    )
    return
  }
  input.setModel(sessionPatch.modelId, sessionPatch.modelLabel)
}
