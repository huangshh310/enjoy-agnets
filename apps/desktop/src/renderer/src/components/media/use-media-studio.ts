/**
 * 多模态生成器状态：模式、提示词、跑 ai.generate。
 */
import { useEffect, useState } from "react"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { generateLibraryMedia } from "@renderer/hooks/media-library"
import { studioGenerationBlockReason } from "./library-actions"
import type { StudioGenerateKind, StudioMode } from "./media-page.types"

export function useMediaStudio(input: {
  sessionId: string | null
  modelId: string | null
  experimentalMedia: boolean
  selectedAudioAsset: AssetRecord | undefined
  refresh: () => Promise<void>
  setNote: (note: string | null) => void
}) {
  const [mode, setMode] = useState<StudioMode>("image")
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!input.experimentalMedia && mode === "video") setMode("image")
  }, [input.experimentalMedia, mode])

  async function runGeneration(kind: StudioGenerateKind) {
    const blocked = studioGenerationBlockReason({
      kind,
      sessionId: input.sessionId,
      modelId: input.modelId,
      experimentalMedia: input.experimentalMedia,
      hasAudio: Boolean(input.selectedAudioAsset)
    })
    if (blocked) {
      input.setNote(blocked)
      return
    }
    if (isGenerating || !input.sessionId || !input.modelId) return
    await runStudioGenerate(kind, input, prompt, setIsGenerating)
  }

  return { mode, setMode, prompt, setPrompt, isGenerating, runGeneration }
}

async function runStudioGenerate(
  kind: StudioGenerateKind,
  input: {
    sessionId: string | null
    modelId: string | null
    selectedAudioAsset: AssetRecord | undefined
    refresh: () => Promise<void>
    setNote: (note: string | null) => void
  },
  prompt: string,
  setIsGenerating: (value: boolean) => void
) {
  if (!input.sessionId || !input.modelId) return
  setIsGenerating(true)
  input.setNote(null)
  try {
    const audioId = input.selectedAudioAsset?.id
    await generateLibraryMedia({
      kind,
      sessionId: input.sessionId,
      modelId: input.modelId,
      prompt,
      attachments: (kind === "transcription" || kind === "translation") && audioId ? [audioId] : []
    })
    await input.refresh()
    input.setNote(`Generated ${kind} asset successfully.`)
  } catch (error: unknown) {
    input.setNote(error instanceof Error ? error.message : `Failed to generate ${kind}.`)
  } finally {
    setIsGenerating(false)
  }
}
