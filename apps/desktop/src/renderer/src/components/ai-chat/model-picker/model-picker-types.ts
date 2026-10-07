/**
 * 模型选择器核心类型定义与工具函数
 */
import type { ModelOption } from "@renderer/stores/chat-store"

export type ProviderGroup = {
  key: string
  provider: string
  providerId?: string
  providerName: string
  apiStyle?: string
  wireStyles?: string[]
  active?: boolean
  models: ModelOption[]
}

export function formatProviderTitle(provider: string): string {
  if (!provider) return "Provider"
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}
