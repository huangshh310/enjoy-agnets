/**
 * 文生视频 / 图生视频：experimental_generateVideo。
 * 字节优先；xAI 有时只给 ephemeral URL，main 再下载。
 */
import { Buffer } from "node:buffer"
import { experimental_generateVideo } from "ai"

type MediaBytes = {
  bytes: Uint8Array
  mediaType: string
  name: string
  experimental?: boolean
}

export const VIDEO_POLL_TIMEOUT_MS = 600_000
export const DEFAULT_VIDEO_DURATION_SEC = 5

export type VideoGenerateInput = {
  model: unknown
  prompt: string
  image?: Uint8Array
  abortSignal?: AbortSignal
}

export function videoGenerationPrompt(text: string, image?: Uint8Array) {
  const trimmed = text.trim()
  if (image && image.byteLength > 0) return { text: trimmed, image }
  return trimmed
}

export function videoTimeoutMs(preferenceMs: number | undefined): number | undefined {
  if (!preferenceMs || preferenceMs <= 0) return undefined
  return Math.max(Math.floor(preferenceMs), VIDEO_POLL_TIMEOUT_MS)
}

export async function generateVideoBytes(input: VideoGenerateInput): Promise<MediaBytes> {
  try {
    const result = await experimental_generateVideo({
      model: input.model as never,
      prompt: videoGenerationPrompt(input.prompt, input.image) as never,
      duration: DEFAULT_VIDEO_DURATION_SEC,
      aspectRatio: "16:9",
      abortSignal: input.abortSignal,
      providerOptions: {
        xai: { resolution: "480p", pollTimeoutMs: VIDEO_POLL_TIMEOUT_MS }
      }
    })
    const bytes = await videoBytesFromResult(result)
    return { bytes, mediaType: "video/mp4", name: "generated.mp4", experimental: true }
  } catch (error) {
    throw explainVideoError(error)
  }
}

export function explainVideoError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (/Cannot connect to API|Connect Timeout/i.test(message)) {
    return new Error(
      "Cannot reach the video API (connection timed out). Use the same Base URL that works for grok image generation; official api.x.ai may be unreachable on this network."
    )
  }
  return error instanceof Error ? error : new Error(message)
}

type VideoResult = {
  video?: { uint8Array?: Uint8Array; base64?: string }
  videos?: Array<{ uint8Array?: Uint8Array; base64?: string }>
  providerMetadata?: { xai?: { videoUrl?: string } }
}

function asBytes(value: { uint8Array?: Uint8Array; base64?: string } | undefined): Uint8Array | undefined {
  if (!value) return undefined
  if (value.uint8Array && value.uint8Array.byteLength > 0) return value.uint8Array
  if (value.base64) return Buffer.from(value.base64, "base64")
  return undefined
}

export async function videoBytesFromResult(
  result: VideoResult,
  fetchUrl: (url: string) => Promise<Uint8Array> = downloadBytes
): Promise<Uint8Array> {
  const file = result.video ?? result.videos?.[0]
  const bytes = asBytes(file)
  if (bytes && bytes.byteLength > 0) return bytes
  const url = result.providerMetadata?.xai?.videoUrl
  if (url) return fetchUrl(url)
  throw new Error("Video provider returned no bytes.")
}

async function downloadBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download video (${response.status}).`)
  return new Uint8Array(await response.arrayBuffer())
}
