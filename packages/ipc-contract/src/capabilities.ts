/**
 * Provider / 模型能力：静态目录 + 动态探测结果。
 */
import { z } from "zod"

export const ProviderCapability = z.enum([
  "text",
  "streaming",
  "reasoning",
  "tools",
  "structured",
  "vision",
  "files",
  "skills",
  "image",
  "embedding",
  "rerank",
  "speech",
  "transcription",
  "realtime",
  "video"
])
export type ProviderCapability = z.infer<typeof ProviderCapability>

export const ModelCapabilityRecord = z.object({
  modelId: z.string(),
  providerId: z.string(),
  staticCaps: z.array(ProviderCapability),
  probedCaps: z.array(ProviderCapability).default([]),
  probedAt: z.number().int().optional(),
  unsupportedReason: z.record(z.string(), z.string()).optional()
})
export type ModelCapabilityRecord = z.infer<typeof ModelCapabilityRecord>
