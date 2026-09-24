/**
 * 把预设套到当前 Composer。正在跑或等审批时不动。
 * 换引擎仍走已有交接确认，不静默切走。
 */
import type { ComposerPreset } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { requestEngineSwitch, useEngineHandoffStore } from "./handoff/engine-handoff-store"
import { applyPresetFace, currentPresetFace, type PresetFace } from "./preset-face"

export async function applyComposerPreset(preset: ComposerPreset): Promise<void> {
  const store = useChatStore.getState()
  if (store.running || store.pendingApproval) return
  const face = presetFaceOf(preset)
  const result = await requestEngineSwitch(preset.runtimeId, preset.modelId || undefined)
  if (result === "pending") {
    useEngineHandoffStore.setState({ pendingPreset: face })
    return
  }
  if (result === "blocked") return
  applyPresetFace(face)
}

export function currentPresetDraft(name: string, note: string) {
  const store = useChatStore.getState()
  const face = currentPresetFace()
  return {
    name,
    note,
    runtimeId: store.runtimeId,
    modelId: store.modelId,
    surface: face.surface,
    reasoningEffort: face.reasoningEffort,
    acpThoughtLevel: face.acpThoughtLevel
  }
}

function presetFaceOf(preset: ComposerPreset): PresetFace {
  return {
    surface: preset.surface,
    reasoningEffort: preset.reasoningEffort,
    acpThoughtLevel: preset.acpThoughtLevel
  }
}
