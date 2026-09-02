/**
 * Providers 设置页的编辑器与探测状态类型。
 * 密钥只在表单里短暂持有，保存后 renderer 不再读明文。
 */
import { presetFor, type ApiStyle, type ProviderKind } from "@enjoy-agents/providers/presets"

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

export type EditorState = {
  id?: string
  kind: ProviderKind
  name: string
  apiKey: string
  baseURL: string
  modelId: string
  apiStyle: ApiStyle
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: ReasoningEffort
  customHeaders?: string
  customBody?: string
  models?: Array<{ id: string; label: string }>
}

export type ProbeState = {
  status: "idle" | "pending" | "ok" | "error"
  message: string
  models: Array<{ id: string; label: string }>
}

export const IDLE_PROBE: ProbeState = { status: "idle", message: "", models: [] }

/** 按预设填充一张空白表单；编辑已有配置时再覆盖 id / 密钥。 */
export function emptyEditor(kind: ProviderKind = "deepseek", apiStyle?: ApiStyle): EditorState {
  const preset = presetFor(kind)
  return {
    kind,
    name: preset.name,
    apiKey: "",
    baseURL: preset.defaultBaseURL,
    modelId: preset.models[0]?.id ?? "",
    apiStyle: apiStyle ?? preset.apiStyle,
    fastModelId: "",
    reasoningModelId: "",
    contextWindow: undefined,
    maxTokens: 4096,
    temperature: 0.7,
    reasoningEffort: undefined,
    customHeaders: "",
    customBody: "",
    models: [...preset.models]
  }
}
