/**
 * 预设里除引擎/模型以外的面和思考档。交接确认之后还要补上。
 */
import type { ComposerPresetSurface } from "@enjoy-agents/ipc-contract"
import type { ReasoningEffort } from "@renderer/stores/chat-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { applyComposerSurface, surfaceForMode } from "../composer/composer-mode"

export type PresetFace = {
  surface: ComposerPresetSurface
  reasoningEffort?: ReasoningEffort
  acpThoughtLevel?: string
}

export function applyPresetFace(face: PresetFace): void {
  const next = useChatStore.getState()
  next.setMode(applyComposerSurface(next.mode, face.surface))
  if (face.reasoningEffort) next.setReasoningEffort(face.reasoningEffort)
  if (face.acpThoughtLevel) next.setAcpThoughtLevel(face.acpThoughtLevel)
}

export function currentPresetFace(): PresetFace {
  const store = useChatStore.getState()
  return {
    surface: surfaceForMode(store.mode),
    reasoningEffort: store.reasoningEffort,
    acpThoughtLevel: store.acpThoughtLevel || undefined
  }
}
