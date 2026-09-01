/**
 * 媒体生成：generateImage / generateSpeech / transcribe。
 * 视频见 generate-video.ts。
 */
import { Buffer } from "node:buffer"
import { generateImage, generateSpeech, transcribe } from "ai"

export type MediaBytes = {
  bytes: Uint8Array
  mediaType: string
  name: string
  experimental?: boolean
}

function asBytes(value: unknown): Uint8Array | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as { uint8Array?: Uint8Array; base64?: string }
  if (record.uint8Array) return record.uint8Array
  if (record.base64) return Buffer.from(record.base64, "base64")
  return undefined
}

export async function generateImageBytes(model: unknown, prompt: string): Promise<MediaBytes> {
  const result = await generateImage({ model: model as never, prompt })
  const image = (result as { image?: unknown; images?: unknown[] }).image
    ?? (result as { images?: unknown[] }).images?.[0]
  const bytes = asBytes(image)
  if (!bytes) throw new Error("Image provider returned no bytes.")
  return { bytes, mediaType: "image/png", name: "generated.png" }
}

export async function generateSpeechBytes(model: unknown, text: string): Promise<MediaBytes> {
  const result = await generateSpeech({ model: model as never, text })
  const bytes = asBytes((result as { audio?: unknown }).audio)
  if (!bytes) throw new Error("Speech provider returned no audio.")
  return { bytes, mediaType: "audio/mpeg", name: "speech.mp3" }
}

export async function transcribeAudio(
  model: unknown,
  audio: Uint8Array,
  onDelta?: (text: string) => void
): Promise<string> {
  const streamed = await tryStreamTranscribe(model, audio, onDelta)
  if (streamed) return streamed
  const result = await transcribe({ model: model as never, audio })
  const text = (result as { text?: string }).text
  if (!text) throw new Error("Transcription returned no text.")
  onDelta?.(text)
  return text
}

async function tryStreamTranscribe(
  model: unknown,
  audio: Uint8Array,
  onDelta?: (text: string) => void
): Promise<string | null> {
  const mod = (await import("ai")) as Record<string, unknown>
  const stream = mod.experimental_streamTranscribe as
    | ((options: { model: never; audio: Uint8Array }) => Promise<{ text?: string; textStream?: AsyncIterable<string> }>)
    | undefined
  if (typeof stream !== "function") return null
  const result = await stream({ model: model as never, audio })
  if (result.textStream) {
    let text = ""
    for await (const chunk of result.textStream) {
      text += chunk
      onDelta?.(text)
    }
    return text || null
  }
  if (result.text) {
    onDelta?.(result.text)
    return result.text
  }
  return null
}

export async function translateAudio(
  model: unknown,
  audio: Uint8Array,
  onDelta?: (text: string) => void
): Promise<string | null> {
  const mod = (await import("ai")) as Record<string, unknown>
  const translate = (mod.experimental_streamTranslate ?? mod.streamTranslate) as
    | ((options: { model: never; audio: Uint8Array }) => TranslateResult | Promise<TranslateResult>)
    | undefined
  if (typeof translate !== "function") return null
  try {
    const result = await Promise.resolve(translate({ model: model as never, audio }))
    const streamed = await readTranslateStream(result, onDelta)
    if (streamed) return streamed
    const text = await Promise.resolve(result.translationText ?? result.text)
    if (typeof text === "string" && text) {
      onDelta?.(text)
      return text
    }
    return null
  } catch {
    return null
  }
}

type TranslateResult = {
  translationText?: Promise<string> | string
  text?: string
  fullStream?: AsyncIterable<Record<string, unknown>>
}

async function readTranslateStream(
  result: TranslateResult,
  onDelta?: (text: string) => void
): Promise<string | null> {
  if (!result.fullStream) return null
  let text = ""
  for await (const part of result.fullStream) {
    const chunk = typeof part.text === "string" ? part.text : ""
    if (!chunk) continue
    text += chunk
    onDelta?.(text)
  }
  return text || null
}

export { generateVideoBytes, videoTimeoutMs } from "./generate-video.ts"
