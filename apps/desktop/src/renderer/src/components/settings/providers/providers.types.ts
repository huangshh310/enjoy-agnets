/**
 * Providers 设置页的编辑器状态。
 * Key 明文只活在这张表单里，保存后 renderer 不再持有。
 */
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import {
  endpointsFor,
  isApiStyle,
  presetFor,
  type ApiStyle,
  type ProviderKind
} from "@enjoy-agents/providers/presets"

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"
export type ReasoningFamily = "auto" | "minimax" | "glm" | "kimi" | "deepseek" | "default"
export type CatalogSource = "preset" | "remote" | "manual"

export type EditorEndpoints = {
  openai?: string
  anthropic?: string
  "openai-responses"?: string
}

export type EditorKey = {
  id: string
  name: string
  apiKey: string
  apiStyle?: ApiStyle
  enabled: boolean
  hasKey: boolean
  keyHint: string
}

export type EditorModel = {
  id: string
  label: string
  enabled: boolean
  source: CatalogSource
  contextWindow?: number
  maxOutputTokens?: number
}

export type EditorState = {
  id?: string
  kind: ProviderKind
  name: string
  enabled: boolean
  endpoints: EditorEndpoints
  baseAPI: ApiStyle
  regionId?: string
  keys: EditorKey[]
  models: EditorModel[]
  modelsURL?: string
  modelId: string
  fastModelId?: string
  reasoningModelId?: string
  reasoningFamily: ReasoningFamily
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: ReasoningEffort
  customHeaders?: string
  customBody?: string
  proxy: string
  /** 检测结果和用户改过的 URL 不一致时，该协议为 true。 */
  detectMismatch?: Partial<Record<ApiStyle, boolean>>
  /** 最近一次检测的 i18n code，不进保存体。 */
  detectCodes?: Partial<Record<ApiStyle, string>>
}

export type ProbeState = {
  status: "idle" | "pending" | "ok" | "error"
  message: string
  code?: string
  vars?: Record<string, string>
  models: Array<{ id: string; label: string }>
}

export const IDLE_PROBE: ProbeState = { status: "idle", message: "", models: [] }

export const WIRE_STYLES = ["openai", "openai-responses", "anthropic"] as const

const FAMILIES: readonly ReasoningFamily[] = ["auto", "minimax", "glm", "kimi", "deepseek", "default"]

/** 按预设区域填一张空白表单。主 API 用预设的 apiStyle，不改用户稍后手填的 URL。 */
export function emptyEditor(kind: ProviderKind = "deepseek", baseAPI?: ApiStyle): EditorState {
  const preset = presetFor(kind)
  const region = preset.regions?.[0]
  const endpoints = { ...(region ? endpointsFor(preset, region.id) : preset.endpoints) }
  const style = baseAPI ?? preset.apiStyle
  const models = preset.models.map(toEditorModel)
  return {
    kind,
    name: preset.name,
    enabled: true,
    endpoints,
    baseAPI: style,
    regionId: region?.id,
    keys: [blankKey()],
    models,
    modelsURL: region?.modelsURL,
    modelId: models.find((model) => model.enabled)?.id ?? "",
    fastModelId: "",
    reasoningModelId: "",
    reasoningFamily: "auto",
    contextWindow: undefined,
    maxTokens: 4096,
    temperature: 0.7,
    reasoningEffort: undefined,
    customHeaders: "",
    customBody: "",
    proxy: ""
  }
}

/** 打开已有档案。Key 框留空，placeholder 用 keyHint，明文不进表单。 */
export function editorFromProfile(profile: ProviderPublic): EditorState {
  const preset = presetFor(profile.kind as ProviderKind)
  const models = (profile.models?.length ? profile.models : preset.models).map(toEditorModel)
  const keys = profile.keys.length
    ? profile.keys.map((key) => ({
      id: key.id,
      name: key.name,
      apiKey: "",
      apiStyle: isApiStyle(key.apiStyle) ? key.apiStyle : undefined,
      enabled: key.enabled,
      hasKey: key.hasKey,
      keyHint: key.keyHint
    }))
    : [blankKey()]
  return {
    id: profile.id,
    kind: profile.kind as ProviderKind,
    name: profile.name,
    enabled: profile.enabled,
    endpoints: { ...profile.endpoints },
    baseAPI: isApiStyle(profile.baseAPI) ? profile.baseAPI : preset.apiStyle,
    regionId: profile.regionId,
    keys,
    models,
    modelsURL: profile.modelsURL,
    modelId: profile.modelId,
    fastModelId: profile.fastModelId || "",
    reasoningModelId: profile.reasoningModelId || "",
    reasoningFamily: isFamily(profile.reasoningFamily) ? profile.reasoningFamily : "auto",
    contextWindow: profile.contextWindow,
    maxTokens: profile.maxTokens ?? 4096,
    temperature: profile.temperature ?? 0.7,
    reasoningEffort: profile.reasoningEffort,
    customHeaders: profile.customHeaders || "",
    customBody: profile.customBody || "",
    proxy: profile.proxy ?? ""
  }
}

export function blankKey(): EditorKey {
  return {
    id: `key_${crypto.randomUUID()}`,
    name: "",
    apiKey: "",
    enabled: true,
    hasKey: false,
    keyHint: ""
  }
}

export function toEditorModel(model: {
  id: string
  label?: string
  enabled?: boolean
  source?: string
  contextWindow?: number
  maxOutputTokens?: number
}): EditorModel {
  return {
    id: model.id,
    label: model.label?.trim() || model.id,
    enabled: model.enabled !== false,
    source: isSource(model.source) ? model.source : "manual",
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens
  }
}

function isSource(value: string | undefined): value is CatalogSource {
  return value === "preset" || value === "remote" || value === "manual"
}

function isFamily(value: string | undefined): value is ReasoningFamily {
  return Boolean(value && (FAMILIES as readonly string[]).includes(value))
}

/** 保存体只带端点，不带派生 baseURL，避免一条 URL 把兄弟端点清掉。 */
export function providerUpsertPayload(editor: EditorState, activate: boolean) {
  return {
    id: editor.id,
    name: editor.name.trim(),
    kind: editor.kind,
    modelId: editor.modelId.trim(),
    fastModelId: editor.fastModelId?.trim() || undefined,
    reasoningModelId: editor.reasoningModelId?.trim() || undefined,
    contextWindow: editor.contextWindow ?? null,
    maxTokens: editor.maxTokens,
    temperature: editor.temperature,
    reasoningEffort: editor.reasoningEffort,
    customHeaders: editor.customHeaders,
    customBody: editor.customBody,
    models: editor.models,
    activate,
    endpoints: cleanEndpoints(editor.endpoints),
    baseAPI: editor.baseAPI,
    regionId: editor.regionId,
    keys: editor.keys.map((key) => ({
      id: key.id,
      name: key.name,
      apiKey: key.apiKey.trim(),
      apiStyle: key.apiStyle,
      enabled: key.enabled
    })),
    enabled: editor.enabled,
    modelsURL: editor.modelsURL,
    reasoningFamily: editor.reasoningFamily,
    proxy: editor.proxy.trim()
  }
}

export function cleanEndpoints(endpoints: EditorEndpoints): EditorEndpoints {
  const out: EditorEndpoints = {}
  for (const style of WIRE_STYLES) {
    const value = endpoints[style]?.trim().replace(/\/+$/, "")
    if (value) out[style] = value
  }
  return out
}

export function canSaveEditor(editor: EditorState | null, requiresKey: boolean): boolean {
  if (!editor?.name.trim() || !editor.modelId.trim()) return false
  if (editor.kind === "custom" && !hasEndpoint(editor.endpoints)) return false
  if (proxyBlocksSave(editor.proxy)) return false
  if (!requiresKey) return true
  return editor.keys.some((key) => key.enabled && (key.apiKey.trim() || key.hasKey))
}

export function hasEndpoint(endpoints: EditorEndpoints): boolean {
  return WIRE_STYLES.some((style) => Boolean(endpoints[style]?.trim()))
}

/** socks 没有接线。标成不可用，保存按钮也停住。 */
export function proxyBlocksSave(proxy: string): boolean {
  const raw = proxy.trim().toLowerCase()
  return raw.startsWith("socks:") || raw.startsWith("socks4:") || raw.startsWith("socks5:")
}
