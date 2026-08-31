/**
 * Rerank 模型工厂。Cohere 走官方 reranking；其余不假装有 Provider。
 */
import { createCohere } from "@ai-sdk/cohere"
import type { ProviderConfig } from "../types"

export function defaultRerankModelId(kind: string, requested?: string): string {
  if (requested && /rerank/i.test(requested)) return requested
  if (kind === "cohere") return "rerank-english-v3.0"
  return requested || "rerank-english-v3.0"
}

export function createRerankModel(config: ProviderConfig): unknown | undefined {
  if (config.provider !== "cohere" && !/rerank|cohere/i.test(config.modelId)) return undefined
  return createCohere({ apiKey: config.apiKey || "" }).reranking(config.modelId)
}
