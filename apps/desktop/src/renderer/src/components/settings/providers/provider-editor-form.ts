/**
 * 编辑器里的纯变换：切区域、合并拉取结果、套用协议检测。
 * 不发请求，也不读 vault。
 */
import { endpointsFor, type ApiStyle, type ProviderPreset } from "@enjoy-agents/providers/presets"
import {
  WIRE_STYLES,
  cleanEndpoints,
  toEditorModel,
  type EditorEndpoints,
  type EditorModel,
  type EditorState
} from "./providers.types"

/** 只替换仍等于上一区域官方值的端点。用户改过的 URL 留着。 */
export function applyRegionSwitch(
  editor: EditorState,
  preset: ProviderPreset,
  regionId: string
): Pick<EditorState, "regionId" | "endpoints" | "modelsURL"> {
  const previous = endpointsFor(preset, editor.regionId)
  const nextRegion = preset.regions?.find((region) => region.id === regionId)
  const next = nextRegion?.endpoints ?? endpointsFor(preset, regionId)
  const endpoints = swapOfficial(editor.endpoints, previous, next)
  const previousUrl = regionModelsUrl(preset, editor.regionId)
  const modelsURL = (editor.modelsURL ?? "") === previousUrl ? nextRegion?.modelsURL : editor.modelsURL
  return { regionId, endpoints, modelsURL }
}

function swapOfficial(
  current: EditorEndpoints,
  previous: EditorEndpoints,
  next: EditorEndpoints
): EditorEndpoints {
  const out: EditorEndpoints = { ...current }
  for (const style of WIRE_STYLES) {
    if (norm(current[style]) !== norm(previous[style])) continue
    const incoming = next[style]?.trim()
    if (incoming) out[style] = incoming
    else delete out[style]
  }
  return out
}

function regionModelsUrl(preset: ProviderPreset, regionId?: string): string {
  if (!regionId) return ""
  return preset.regions?.find((region) => region.id === regionId)?.modelsURL ?? ""
}

export function norm(value?: string): string {
  return value?.trim().replace(/\/+$/, "") ?? ""
}

/**
 * 成功的协议写进对应端点。
 * 用户已经改过、且和检测结果不同的那条保留，并标 mismatch。
 */
export function applyDetectResults(
  endpoints: EditorEndpoints,
  probes: ReadonlyArray<{ style: ApiStyle; ok: boolean; base: string; code?: string }>
): {
  endpoints: EditorEndpoints
  detectMismatch: Partial<Record<ApiStyle, boolean>>
  detectCodes: Partial<Record<ApiStyle, string>>
} {
  const next: EditorEndpoints = { ...endpoints }
  const detectMismatch: Partial<Record<ApiStyle, boolean>> = {}
  const detectCodes: Partial<Record<ApiStyle, string>> = {}
  for (const probe of probes) {
    if (probe.code) detectCodes[probe.style] = probe.code
    if (!probe.ok || !probe.base.trim()) continue
    const current = norm(endpoints[probe.style])
    const detected = norm(probe.base)
    if (!current || current === detected) next[probe.style] = detected
    else detectMismatch[probe.style] = true
  }
  return { endpoints: cleanEndpoints(next), detectMismatch, detectCodes }
}

/** 远程新增的追加为启用。关掉的不打开，手填的留着，远程消失的不删。 */
export function mergeCatalog(existing: EditorModel[], remote: ReadonlyArray<{ id: string; label: string }>): EditorModel[] {
  const known = new Set(existing.map((model) => model.id))
  const added = remote
    .filter((model) => model.id && !known.has(model.id))
    .map((model) => toEditorModel({ ...model, enabled: true, source: "remote" }))
  return [...existing, ...added]
}

/**
 * 拉目录用的协议。地址落在 Chat 或 Responses 上时不能跟 baseAPI 去打 Anthropic /models。
 */
export function catalogStyleOf(editor: EditorState): ApiStyle {
  const url = catalogUrlOf(editor)
  const chat = editor.endpoints.openai?.trim().replace(/\/+$/, "")
  const responses = editor.endpoints["openai-responses"]?.trim().replace(/\/+$/, "")
  if ((chat && url === chat) || (responses && url === responses)) return "openai"
  if (editor.baseAPI === "openai-responses") return "openai"
  return editor.baseAPI
}

/** 拉目录的地址：modelsURL，否则 Chat，再 Responses，再去掉 Anthropic 根上的 /anthropic。 */
export function catalogUrlOf(editor: EditorState): string {
  const override = editor.modelsURL?.trim()
  if (override) return override.replace(/\/+$/, "")
  const chat = editor.endpoints.openai?.trim()
  if (chat) return chat.replace(/\/+$/, "")
  const responses = editor.endpoints["openai-responses"]?.trim()
  if (responses) return responses.replace(/\/+$/, "")
  const anthropic = editor.endpoints.anthropic?.trim().replace(/\/+$/, "")
  if (anthropic) return anthropic.replace(/\/anthropic$/, "")
  return ""
}

/** 检测用主 Base URL。空则退到任意一条已填端点。 */
export function detectUrlOf(editor: EditorState): string {
  return editor.endpoints[editor.baseAPI]?.trim()
    || editor.endpoints.openai?.trim()
    || editor.endpoints["openai-responses"]?.trim()
    || editor.endpoints.anthropic?.trim()
    || ""
}

/** 展示用。auto 跟 kind，custom 才看模型 id 前缀。 */
export function inferredFamily(kind: string, modelId: string): Exclude<EditorState["reasoningFamily"], "auto"> {
  if (kind === "minimax") return "minimax"
  if (kind === "zhipu" || kind === "zai") return "glm"
  if (kind === "kimi") return "kimi"
  if (kind === "deepseek") return "deepseek"
  if (kind === "custom") return familyFromModel(modelId)
  return "default"
}

function familyFromModel(modelId: string): Exclude<EditorState["reasoningFamily"], "auto"> {
  const id = modelId.toLowerCase()
  if (id.startsWith("minimax")) return "minimax"
  if (id.startsWith("glm")) return "glm"
  if (id.startsWith("kimi") || id.startsWith("moonshot")) return "kimi"
  if (id.startsWith("deepseek")) return "deepseek"
  return "default"
}
