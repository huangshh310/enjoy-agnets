/**
 * 供应商对外入口：建连、探测、目录。
 */
import { rememberProbedModels } from "./capabilities/probe"
import { discoverRemoteModels } from "./discover"
import { resolvedBaseURL } from "./config"
import { usesOfficialGoogle } from "./google"
import { presetFor, PROVIDER_PRESETS, type CatalogModel, type ProviderKind } from "./presets"
import type { ProviderConfig } from "./types"

export {
  API_STYLES,
  API_STYLE_OPTIONS,
  apiStyleLabel,
  isApiStyle,
  PROVIDER_KINDS,
  PROVIDER_PRESETS,
  normalizeBaseURL,
  presetFor,
  isMediaNativeKind,
  isMediaOnlyKind,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind,
  type ProviderPreset
} from "./presets"

export { pingProviderEndpoint, type PingResult } from "./discover"
export { createLanguageModel } from "./create-model"
export { usesOfficialGoogle } from "./google"
export {
  deepseekCallOptions,
  isDeepSeekModelId,
  usesDeepSeekReasoningApi,
  type ReasoningEffort
} from "./reasoning"
export type { ProviderConfig } from "./types"
export {
  ALL_CAPABILITIES,
  staticCapabilitiesFor,
  capabilityLabel,
  unsupportedReason
} from "./capabilities/catalog"
export {
  rememberProbedModels,
  probedCapabilitiesFor,
  effectiveCapabilities,
  clearProbedCapabilities
} from "./capabilities/probe"
export { resolveModelAlias, createEnjoyRegistry, type ModelAlias } from "./registry"
export { mergeModelSettings, wrapWithDefaults, type MiddlewareDefaults } from "./middleware"
export { createFilesApi, createSkillsApi } from "./provider-api"
export {
  createImageModel,
  createSpeechModel,
  createTranscriptionModel,
  createEmbeddingModel,
  createVideoModel,
  createTranslationModel,
  createRerankModel,
  defaultRerankModelId,
  alternateImageModelId,
  alternateSpeechModelId,
  alternateTranscriptionModelId,
  defaultEmbeddingModelId,
  mediaFactoryKind
} from "./media-models"
export { pickMediaFallbackConfig, fallbackKindsFor, type MediaAltProfile } from "./media/fallback-config"

/** @deprecated Use ProviderKind. Kept so older call sites compile. */
export type ProviderId = ProviderKind

export const MODEL_CATALOG = PROVIDER_PRESETS.flatMap((preset) =>
  preset.models.map((model) => ({
    id: model.id,
    label: model.label,
    provider: preset.kind
  }))
)

export function providerForModel(modelId: string): ProviderKind {
  const match = MODEL_CATALOG.find((entry) => entry.id === modelId)
  return match?.provider ?? "custom"
}

export function modelsForProvider(
  kind: ProviderKind,
  extraModelId?: string,
  savedModels?: CatalogModel[]
): CatalogModel[] {
  const base = savedModels && savedModels.length > 0 ? savedModels : presetFor(kind).models
  const models = [...base]
  if (extraModelId && !models.some((model) => model.id === extraModelId)) {
    models.unshift({ id: extraModelId, label: extraModelId })
  }
  return models
}

export type ProbeResult = {
  ok: boolean
  message: string
  models: CatalogModel[]
  resolvedBaseURL?: string
}

export async function probeProvider(
  config: Omit<ProviderConfig, "modelId"> & { modelId?: string }
): Promise<ProbeResult> {
  const preset = presetFor(config.provider)
  const baseURL = resolvedBaseURL(config)
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama")

  if (preset.requiresKey && !apiKey) {
    return { ok: false, message: "API key is required for this provider.", models: preset.models }
  }
  if (
    preset.kind === "fal" ||
    preset.kind === "replicate" ||
    preset.kind === "elevenlabs" ||
    preset.kind === "deepgram" ||
    preset.kind === "cohere" ||
    usesOfficialGoogle({ provider: config.provider, baseURL })
  ) {
    return {
      ok: true,
      message: "Key accepted. Official SDK will be used at generate time.",
      models: preset.models
    }
  }
  if (!baseURL) {
    return { ok: false, message: "Base URL is required.", models: preset.models }
  }

  try {
    const discovered = await discoverRemoteModels({
      provider: config.provider,
      apiKey,
      baseURL,
      apiStyle: config.apiStyle ?? preset.apiStyle
    })
    if (discovered.models.length > 0) {
      rememberProbedModels(config.provider, discovered.models.map((model) => model.id))
      return {
        ok: true,
        message: `Connected. Found ${discovered.models.length} models.`,
        models: discovered.models,
        resolvedBaseURL: discovered.resolvedBaseURL
      }
    }
    return {
      ok: true,
      message: "Connected. Enter a model ID if the catalog is empty.",
      models: preset.models,
      resolvedBaseURL: discovered.resolvedBaseURL
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      models: preset.models
    }
  }
}

export { discoverRemoteModels } from "./discover"
