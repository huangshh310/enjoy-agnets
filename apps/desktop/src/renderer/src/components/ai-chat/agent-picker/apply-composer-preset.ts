/**
 * 把预设套到当前 Composer。正在跑或等审批时不动。
 * 换引擎仍走已有交接确认，不静默切走。
 * 有提示词则填草稿；有 desktopBias 则开叙事开关（非授权）。
 */
import type { ComposerPreset } from "@enjoy-agents/ipc-contract"
import { normalizePromptTemplate } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { requestEngineSwitch, useEngineHandoffStore } from "./handoff/engine-handoff-store"
import { applyPresetFace, currentPresetFace, type PresetFace } from "./preset-face"

export async function applyComposerPreset(preset: ComposerPreset): Promise<boolean> {
  const store = useChatStore.getState()
  if (store.running || store.pendingApproval) return false
  const face = presetFaceOf(preset)
  const result = await requestEngineSwitch(preset.runtimeId, preset.modelId || undefined)
  if (result === "pending") {
    useEngineHandoffStore.setState({ pendingPreset: face })
    return false
  }
  if (result === "blocked") return false
  applyPresetFace(face)
  return Boolean(normalizePromptTemplate(face.promptTemplate))
}

export function currentPresetDraft(
  name: string,
  note: string,
  extras?: { promptTemplate?: string; desktopBias?: boolean }
) {
  const store = useChatStore.getState()
  const face = currentPresetFace()
  const prompt = normalizePromptTemplate(extras?.promptTemplate)
  const bias = extras?.desktopBias === true
  return {
    name,
    note,
    runtimeId: store.runtimeId,
    modelId: store.modelId,
    surface: face.surface,
    reasoningEffort: face.reasoningEffort,
    acpThoughtLevel: face.acpThoughtLevel,
    ...(prompt ? { promptTemplate: prompt } : {}),
    ...(bias ? { desktopBias: true as const } : {})
  }
}

function presetFaceOf(preset: ComposerPreset): PresetFace {
  return {
    surface: preset.surface,
    reasoningEffort: preset.reasoningEffort,
    acpThoughtLevel: preset.acpThoughtLevel,
    promptTemplate: preset.promptTemplate,
    desktopBias: preset.desktopBias
  }
}
