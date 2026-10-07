/**
 * 生成请求怎么落到 vault 档案和媒体模型。
 * 画布显式选中的生图模型不得被设置页默认模型盖掉。
 */
import { isImageOnlyModelId, isVideoOnlyModelId } from "@enjoy-agents/providers/capabilities"
import type { GenerationKind } from "@enjoy-agents/ipc-contract"

export type GenerateVault<T extends { id: string }> = {
  activeId: string | null
  profiles: T[]
}

export type MediaModelPrefs = {
  defaultImageModelId?: string
  defaultVideoModelId?: string
  defaultSpeechModelId?: string
  defaultTranscriptionModelId?: string
}

/** 优先用请求里的 providerId，找不到再回落当前激活档案。 */
export function pickGenerateProfile<T extends { id: string; enabled?: boolean }>(
  vault: GenerateVault<T>,
  providerId?: string
): T | undefined {
  if (providerId) {
    const match = vault.profiles.find((profile) => profile.id === providerId)
    if (!match || match.enabled === false) return undefined
    return match
  }
  const active = vault.profiles.find((profile) => profile.id === vault.activeId && profile.enabled !== false)
  if (active) return active
  return vault.profiles.find((profile) => profile.enabled !== false)
}

/**
 * 聊天从语言模型切到生图时才用设置页默认模型。
 * 请求已经是 image-only / video-only 时必须原样使用。
 */
export function effectiveMediaModelId(
  kind: GenerationKind,
  requestedModelId: string,
  prefs: MediaModelPrefs
): string {
  if (kind === "image") {
    if (isImageOnlyModelId(requestedModelId)) return requestedModelId
    return prefs.defaultImageModelId || requestedModelId
  }
  if (kind === "video") {
    if (isVideoOnlyModelId(requestedModelId)) return requestedModelId
    return prefs.defaultVideoModelId || requestedModelId
  }
  if (kind === "speech") {
    if (/tts|speech|eleven/i.test(requestedModelId)) return requestedModelId
    return prefs.defaultSpeechModelId || requestedModelId
  }
  if (kind === "transcription") {
    if (/whisper|transcri|nova/i.test(requestedModelId)) return requestedModelId
    return prefs.defaultTranscriptionModelId || requestedModelId
  }
  return requestedModelId
}
