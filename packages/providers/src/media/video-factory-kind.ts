/**
 * 视频工厂选择：纯函数，不碰 SDK，方便 node 测试。
 */
import { isImageOnlyModelId, isVideoOnlyModelId } from "../capabilities/catalog.ts"

export type VideoFactoryKind = "fal" | "replicate" | "xai" | "none"

export function videoFactoryKind(config: { provider: string; modelId: string }): VideoFactoryKind {
  if (isImageOnlyModelId(config.modelId)) return "none"
  if (config.provider === "fal") return "fal"
  if (config.provider === "replicate") return "replicate"
  if (isVideoOnlyModelId(config.modelId) && /imagine-video/.test(config.modelId.toLowerCase())) {
    return "xai"
  }
  return "none"
}

/**
 * 跟生图用同一套可达 Base URL。只有空、或官方 OpenAI 主机才改打 api.x.ai，
 * 否则国内中转能出图却连不上视频。
 */
export function xaiVideoBaseURL(baseURL?: string): string {
  if (!baseURL || /api\.openai\.com/i.test(baseURL)) return "https://api.x.ai/v1"
  return baseURL
}
