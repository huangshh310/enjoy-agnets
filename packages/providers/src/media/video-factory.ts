/**
 * 视频模型工厂：Fal / Replicate 走官方 .video()；grok-imagine-video 走 @ai-sdk/xai。
 * 禁止用 OpenAI 兼容 image() 冒充 VideoModel。
 */
import { createXai } from "@ai-sdk/xai"
import { parseHeaders, resolvedBaseURL } from "../config.ts"
import type { ProviderConfig } from "../types.ts"
import { createOfficialVideoModel } from "./official.ts"
import { videoFactoryKind, xaiVideoBaseURL } from "./video-factory-kind.ts"

export { videoFactoryKind, xaiVideoBaseURL } from "./video-factory-kind.ts"
export type { VideoFactoryKind } from "./video-factory-kind.ts"

export function createVideoModel(config: ProviderConfig): unknown {
  const official = createOfficialVideoModel(config)
  if (official) return official
  if (videoFactoryKind(config) !== "xai") {
    throw new Error(
      `No video factory for model ${config.modelId}. Use grok-imagine-video (xAI) or a Fal/Replicate video model.`
    )
  }
  return createXaiVideoModel(config)
}

function createXaiVideoModel(config: ProviderConfig): unknown {
  const xai = createXai({
    apiKey: config.apiKey,
    baseURL: xaiVideoBaseURL(resolvedBaseURL(config)),
    headers: parseHeaders(config.customHeaders)
  })
  return xai.video(config.modelId)
}
