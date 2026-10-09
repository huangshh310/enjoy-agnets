/**
 * 预设目录入口。渲染进程只从 @enjoy-agents/providers/presets 引这里。
 */
import { MEDIA_PROVIDER_PRESETS } from "../presets-media.ts"
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"
import { CN_PLAN_PRESETS } from "./vendors-cn-plans.ts"
import { CN_VENDOR_PRESETS } from "./vendors-cn.ts"
import { INTL_VENDOR_PRESETS } from "./vendors-intl.ts"
import { LOCAL_PRESETS } from "./local.ts"
import { RELAY_PRESETS } from "./relays.ts"

export {
  isMediaNativeKind,
  isMediaOnlyKind
} from "../presets-media.ts"

export {
  API_STYLES,
  API_STYLE_OPTIONS,
  apiStyleLabel,
  isApiStyle,
  type ApiStyle
} from "../api-styles.ts"

export { PROVIDER_KINDS, parseProviderKind, isProviderKind, type ProviderKind } from "./kinds.ts"

export {
  defaultBaseURLFor,
  definePreset,
  endpointsFor,
  officialSiblingEndpoints,
  pickApiStyle,
  presetModel,
  supportedApiStylesFor,
  type CatalogModel,
  type CatalogSource,
  type PresetGroup,
  type PresetRegion,
  type ProviderPreset
} from "./define.ts"

export {
  adviseCatalogUrl,
  catalogBaseCandidates,
  catalogPersistBase,
  CatalogError,
  htmlCatalogError,
  resolveCatalogBaseURL,
  type CatalogAdvice,
  type CatalogErrorCode
} from "../catalog-url.ts"

function mediaPreset(raw: (typeof MEDIA_PROVIDER_PRESETS)[number]): ProviderPreset {
  const base = raw.defaultBaseURL
  const gateway = raw.kind === "gateway"
  return definePreset({
    kind: raw.kind,
    name: raw.name,
    description: raw.description,
    group: "media",
    apiStyle: raw.apiStyle,
    requiresKey: raw.requiresKey,
    docsURL: raw.docsURL,
    noModelsList: !gateway,
    endpoints: gateway
      ? { openai: base, anthropic: base, "openai-responses": base }
      : { openai: base },
    models: raw.models.map((model) => presetModel(model.id, model.label))
  })
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  ...INTL_VENDOR_PRESETS,
  ...CN_VENDOR_PRESETS,
  ...CN_PLAN_PRESETS,
  ...RELAY_PRESETS,
  ...LOCAL_PRESETS,
  ...MEDIA_PROVIDER_PRESETS.map(mediaPreset)
]

export function presetFor(kind: string): ProviderPreset {
  return PROVIDER_PRESETS.find((preset) => preset.kind === kind) ?? PROVIDER_PRESETS.find((preset) => preset.kind === "custom")!
}

export function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, "")
}
