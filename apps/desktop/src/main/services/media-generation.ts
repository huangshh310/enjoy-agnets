/**
 * 媒体 kind：调用 AI SDK 生成并写入资产库。
 */
import type { BrowserWindow } from "electron"
import {
  generateImageBytes,
  generateSpeechBytes,
  generateVideoBytes,
  transcribeAudio,
  translateAudio,
  withMediaFallback
} from "@enjoy-agents/agent-core"
import type { GenerationKind } from "@enjoy-agents/ipc-contract"
import {
  alternateImageModelId,
  alternateSpeechModelId,
  alternateTranscriptionModelId,
  createImageModel,
  createSpeechModel,
  createTranscriptionModel,
  createTranslationModel,
  createVideoModel,
  type ProviderConfig
} from "@enjoy-agents/providers"
import { stampAndSend } from "./event-bus"
import { readAssetBytes, saveGeneratedAsset } from "./asset-service"
import { resolveMediaFallback } from "./media-alt-config"
import { persistMediaAssistantAsset, persistMediaUserPrompt } from "./persist-media-chat"

export async function runMediaKind(options: {
  window: BrowserWindow
  runId: string
  sessionId: string
  kind: GenerationKind
  prompt?: string
  attachments: string[]
  config: ProviderConfig
  persistChat?: boolean
}): Promise<void> {
  const { window, runId, sessionId, kind, prompt, config, persistChat } = options
  if (persistChat && prompt?.trim()) {
    persistMediaUserPrompt(sessionId, prompt, options.attachments)
  }
  if (kind === "realtime-session") {
    stampAndSend(
      window,
      {
        type: "generation.warning",
        runId,
        code: "experimental",
        message: "Realtime uses realtime.open. This generate kind is experimental.",
        experimental: true
      },
      sessionId
    )
    return
  }
  if (kind === "transcription" || kind === "translation") {
    await runAudioText(options, kind)
    return
  }
  const media = await generateMediaBytes(kind, prompt ?? "", config)
  const asset = await saveGeneratedAsset(media)
  stampAndSend(
    window,
    {
      type: "asset.created",
      runId,
      assetId: asset.id,
      mediaType: asset.mediaType,
      name: asset.name,
      size: asset.size,
      experimental: media.experimental
    },
    sessionId
  )
  if (persistChat) persistMediaAssistantAsset(sessionId, asset, mediaRunKind(kind))
}

async function runAudioText(
  options: {
    window: BrowserWindow
    runId: string
    sessionId: string
    attachments: string[]
    config: ProviderConfig
  },
  kind: "transcription" | "translation"
): Promise<void> {
  const assetId = options.attachments[0]
  if (!assetId) throw new Error(`${kind} requires an attached audio asset.`)
  const asset = await readAssetBytes(assetId)
  const audio = Buffer.from(asset.bytesBase64, "base64")
  const fallbackConfig = await resolveMediaFallback(
    options.config,
    "transcription",
    alternateTranscriptionModelId(options.config.modelId)
  )
  let sent = ""
  const emitChunk = (full: string) => {
    const chunk = full.slice(sent.length)
    if (!chunk) return
    sent = full
    stampAndSend(
      options.window,
      { type: "text.delta", runId: options.runId, text: chunk },
      options.sessionId
    )
  }
  const run = audioTextRunner(kind, options.config, fallbackConfig, audio, emitChunk)
  const text = await withMediaFallback(run.primary, run.fallback)
  if (!sent && text.value) emitChunk(text.value)
}

function audioTextRunner(
  kind: "transcription" | "translation",
  config: ProviderConfig,
  fallback: ProviderConfig,
  audio: Buffer,
  emitChunk: (full: string) => void
) {
  if (kind === "translation") {
    const requireText = async (model: unknown) => {
      const text = await translateAudio(model, audio, emitChunk)
      if (!text) throw new Error("Translation returned no text.")
      return text
    }
    return {
      primary: () => requireText(createTranslationModel(config)),
      fallback: () => requireText(createTranslationModel(fallback))
    }
  }
  return {
    primary: () => transcribeAudio(createTranscriptionModel(config), audio, emitChunk),
    fallback: () => transcribeAudio(createTranscriptionModel(fallback), audio, emitChunk)
  }
}

async function generateMediaBytes(kind: GenerationKind, prompt: string, config: ProviderConfig) {
  if (kind === "image") {
    const fallback = await resolveMediaFallback(config, "image", alternateImageModelId(config.modelId))
    const result = await withMediaFallback(
      () => generateImageBytes(createImageModel(config), prompt),
      () => generateImageBytes(createImageModel(fallback), prompt)
    )
    return result.value
  }
  if (kind === "speech") {
    const fallback = await resolveMediaFallback(config, "speech", alternateSpeechModelId(config.modelId))
    const result = await withMediaFallback(
      () => generateSpeechBytes(createSpeechModel(config), prompt),
      () => generateSpeechBytes(createSpeechModel(fallback), prompt)
    )
    return result.value
  }
  const videoFallback = await resolveMediaFallback(config, "video", config.modelId)
  const result = await withMediaFallback(
    () => generateVideoBytes(createVideoModel(config), prompt),
    () => generateImageBytes(createImageModel(videoFallback), prompt)
  )
  return { ...result.value, experimental: true as const }
}

function mediaRunKind(kind: GenerationKind) {
  if (kind === "image" || kind === "video") return kind
  return undefined
}
