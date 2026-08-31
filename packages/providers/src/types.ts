/**
 * 供应商运行配置：建连与推理参数。
 */
import type { ApiStyle } from "./api-styles"
import type { CatalogModel, ProviderKind } from "./presets"
import type { ReasoningEffort } from "./reasoning"

export type ProviderConfig = {
  provider: ProviderKind
  apiKey: string
  modelId: string
  baseURL?: string
  apiStyle?: ApiStyle
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: ReasoningEffort
  customHeaders?: Record<string, string> | string
  customBody?: Record<string, unknown> | string
  models?: CatalogModel[]
}
