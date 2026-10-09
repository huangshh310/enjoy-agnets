/**
 * 供应商对外入口：建连、探测、目录。
 */
import { rememberProbedModels } from "./capabilities/probe.ts"
import { CatalogError } from "./catalog-url.ts"
import { discoverRemoteModels } from "./discover.ts"
import { resolvedBaseURL } from "./config.ts"
import { usesOfficialGoogle } from "./google.ts"
import { presetFor, PROVIDER_PRESETS, type CatalogModel, type ProviderKind } from "./presets.ts"
import type { ProviderConfig } from "./types.ts"

export {
  API_STYLES,
  API_STYLE_OPTIONS,
  apiStyleLabel,
  isApiStyle,
  PROVIDER_KINDS,
  parseProviderKind,
  PROVIDER_PRESETS,
  normalizeBaseURL,
  presetFor,
  supportedApiStylesFor,
  defaultBaseURLFor,
  isMediaNativeKind,
  isMediaOnlyKind,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind,
  type ProviderPreset
} from "./presets.ts"

export {
  migrateStoredProfile,
  normalizeVault,
  withDerived,
  type LooseProfile,
  type NormalizedProfile,
  type ProfileKey,
  type ProfileUpsertInput,
  type ReasoningFamilyName
} from "./profile-migrate.ts"
export { applyProfileUpsert } from "./profile-upsert.ts"
export {
  catalogRequestURL,
  cleanEndpoints,
  derivedApiKey,
  derivedBaseURL,
  detectBase,
  endpointFor,
  filledStyles,
  keyFor,
  keysFor,
  speakStyle,
  type ProviderEndpoints,
  type ProviderKeyRecord
} from "./endpoints.ts"
export { fetchForProxy, parseProxy, proxyEnvOverlay, type ProxyMode } from "./proxy-fetch.ts"
export { publishedContextWindow } from "./published-context-window.ts"
export { pingProviderEndpoint, type PingResult } from "./discover.ts"
export {
  adviseCatalogUrl,
  catalogBaseCandidates,
  catalogPersistBase,
  CatalogError,
  resolveCatalogBaseURL,
  type CatalogAdvice,
  type CatalogErrorCode
} from "./catalog-url.ts"
export {
  lookupGatewayContextWindow,
  parseCatalogContextWindow,
  parseCatalogMaxOutput,
  resolveModelContextWindow,
  type ContextWindowHints
} from "./context-window.ts"
export {
  GATEWAY_MODELS_URL,
  gatewayContextWindowFor,
  loadGatewayCatalog,
  type GatewayCatalogEntry
} from "./gateway-catalog.ts"
export { createLanguageModel } from "./create-model.ts"
export { detectProtocols, type ProtocolProbe } from "./detect-protocol.ts"
export { languageConfigFromProfile, spokenCall, type CallableProfile } from "./profile-call.ts"
export { languageModelFactoryKind, type LanguageModelFactoryKind } from "./model-factory.ts"
export { usesOfficialGoogle } from "./google.ts"
export {
  OPENAI_COMPAT_NAME,
  deepseekCallOptions,
  glmThinkingOptions,
  isDeepSeekModelId,
  isGlmModelId,
  isKimiModelId,
  isMiniMaxModelId,
  isOfficialMiniMaxHost,
  miniMaxThinkingOptions,
  reasoningCallOptions,
  resolveReasoningFamily,
  usesDeepSeekReasoningApi,
  type ReasoningEffort,
  type ReasoningFamilyName as ReasoningFamily
} from "./reasoning.ts"
export type { ProviderConfig } from "./types.ts"
export {
  ALL_CAPABILITIES,
  staticCapabilitiesFor,
  isImageOnlyModelId,
  isVideoOnlyModelId,
  capabilityLabel,
  unsupportedReason
} from "./capabilities/catalog.ts"
export {
  rememberProbedModels,
  probedCapabilitiesFor,
  effectiveCapabilities,
  clearProbedCapabilities
} from "./capabilities/probe.ts"
export { resolveModelAlias, createEnjoyRegistry, type ModelAlias } from "./registry.ts"
export { mergeModelSettings, wrapWithDefaults, type MiddlewareDefaults } from "./middleware.ts"
export { createFilesApi, createSkillsApi } from "./provider-api.ts"
export {
  createImageModel,
  createSpeechModel,
  createTranscriptionModel,
  createEmbeddingModel,
  createVideoModel,
  videoFactoryKind,
  createTranslationModel,
  createRerankModel,
  defaultRerankModelId,
  alternateImageModelId,
  alternateSpeechModelId,
  alternateTranscriptionModelId,
  defaultEmbeddingModelId,
  mediaFactoryKind
} from "./media-models.ts"
export { pickMediaFallbackConfig, fallbackKindsFor, type MediaAltProfile } from "./media/fallback-config.ts"

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
  const models = base.filter((model) => model.enabled !== false)
  if (extraModelId && !base.some((model) => model.id === extraModelId)) {
    models.unshift({ id: extraModelId, label: extraModelId, enabled: true, source: "manual" })
  }
  return models
}

export type ProbeResult = {
  ok: boolean
  message: string
  models: CatalogModel[]
  resolvedBaseURL?: string
  code?: string
  vars?: Record<string, string>
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
        resolvedBaseURL: discovered.resolvedBaseURL,
        code: "catalogOk",
        vars: { count: String(discovered.models.length) }
      }
    }
    return {
      ok: true,
      message: "Connected. Enter a model ID if the catalog is empty.",
      models: preset.models,
      resolvedBaseURL: discovered.resolvedBaseURL,
      code: "catalogOkEmpty"
    }
  } catch (error) {
    if (error instanceof CatalogError) {
      return {
        ok: false,
        message: error.message,
        models: preset.models,
        code: error.code,
        vars: error.vars
      }
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      models: preset.models
    }
  }
}

export { discoverRemoteModels } from "./discover.ts"
