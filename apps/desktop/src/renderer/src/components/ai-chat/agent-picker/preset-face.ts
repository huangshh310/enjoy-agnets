/**
 * 预设里除引擎/模型以外的面和思考档、可选提示词与桌面叙事。
 * 交接确认之后还要补上。绝不碰在跑轮 / 审批卡。
 */
import type { ComposerPresetSurface } from "@enjoy-agents/ipc-contract"
import { normalizePromptTemplate } from "@enjoy-agents/ipc-contract"
import type { ReasoningEffort } from "@renderer/stores/chat-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { syncComposerDom } from "@renderer/hooks/composer-dom"
import { applyComposerSurface, surfaceForMode } from "../composer/composer-mode"
import { setPresetDesktopBias } from "./preset-desktop-bias"

export type PresetFace = {
  surface: ComposerPresetSurface
  reasoningEffort?: ReasoningEffort
  acpThoughtLevel?: string
  promptTemplate?: string
  desktopBias?: boolean
}

export function applyPresetFace(face: PresetFace): void {
  const next = useChatStore.getState()
  next.setMode(applyComposerSurface(next.mode, face.surface))
  if (face.reasoningEffort) next.setReasoningEffort(face.reasoningEffort)
  if (face.acpThoughtLevel) next.setAcpThoughtLevel(face.acpThoughtLevel)
  const prompt = normalizePromptTemplate(face.promptTemplate)
  if (prompt) {
    next.setComposer(prompt)
    syncComposerDom(prompt, true)
  }
  setPresetDesktopBias(face.desktopBias === true)
}

export function currentPresetFace(): PresetFace {
  const store = useChatStore.getState()
  return {
    surface: surfaceForMode(store.mode),
    reasoningEffort: store.reasoningEffort,
    acpThoughtLevel: store.acpThoughtLevel || undefined
  }
}
