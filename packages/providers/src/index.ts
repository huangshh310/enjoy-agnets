import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { discoverRemoteModels } from "./discover";
import type { ApiStyle } from "./api-styles";
import {
  PROVIDER_PRESETS,
  normalizeBaseURL,
  presetFor,
  type CatalogModel,
  type ProviderKind
} from "./presets";

export {
  API_STYLES,
  API_STYLE_OPTIONS,
  apiStyleLabel,
  isApiStyle,
  PROVIDER_KINDS,
  PROVIDER_PRESETS,
  normalizeBaseURL,
  presetFor,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind,
  type ProviderPreset
} from "./presets";

/** @deprecated Use ProviderKind. Kept so older call sites compile. */
export type ProviderId = ProviderKind;

export type ProviderConfig = {
  provider: ProviderKind;
  apiKey: string;
  modelId: string;
  baseURL?: string;
  apiStyle?: ApiStyle;
};

export const MODEL_CATALOG = PROVIDER_PRESETS.flatMap((preset) =>
  preset.models.map((model) => ({
    id: model.id,
    label: model.label,
    provider: preset.kind
  }))
);

function resolvedBaseURL(config: ProviderConfig): string {
  const fallback = presetFor(config.provider).defaultBaseURL;
  return normalizeBaseURL(config.baseURL || fallback);
}

export function createLanguageModel(config: ProviderConfig): LanguageModel {
  const preset = presetFor(config.provider);
  const baseURL = resolvedBaseURL(config);
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama");
  const apiStyle = config.apiStyle ?? preset.apiStyle;

  if (apiStyle === "anthropic") {
    return createAnthropic({
      apiKey,
      baseURL: baseURL || undefined
    })(config.modelId);
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: baseURL || undefined
  });
  if (apiStyle === "openai-responses") {
    return openai.responses(config.modelId);
  }
  return openai(config.modelId);
}

export function providerForModel(modelId: string): ProviderKind {
  const match = MODEL_CATALOG.find((entry) => entry.id === modelId);
  return match?.provider ?? "custom";
}

export function modelsForProvider(kind: ProviderKind, extraModelId?: string): CatalogModel[] {
  const models = [...presetFor(kind).models];
  if (extraModelId && !models.some((model) => model.id === extraModelId)) {
    models.unshift({ id: extraModelId, label: extraModelId });
  }
  return models;
}

export type ProbeResult = {
  ok: boolean;
  message: string;
  models: CatalogModel[];
  resolvedBaseURL?: string;
};

export async function probeProvider(config: Omit<ProviderConfig, "modelId"> & { modelId?: string }): Promise<ProbeResult> {
  const preset = presetFor(config.provider);
  const baseURL = resolvedBaseURL({ ...config, modelId: config.modelId ?? "probe" });
  const apiKey = config.apiKey || (preset.requiresKey ? "" : "ollama");

  if (preset.requiresKey && !apiKey) {
    return { ok: false, message: "API key is required for this provider.", models: preset.models };
  }
  if (!baseURL) {
    return { ok: false, message: "Base URL is required.", models: preset.models };
  }

  try {
    const discovered = await discoverRemoteModels({
      provider: config.provider,
      apiKey,
      baseURL,
      apiStyle: config.apiStyle ?? preset.apiStyle
    });
    if (discovered.models.length > 0) {
      return {
        ok: true,
        message: `Connected. Found ${discovered.models.length} models.`,
        models: discovered.models,
        resolvedBaseURL: discovered.resolvedBaseURL
      };
    }
    return {
      ok: true,
      message: "Connected. Enter a model ID if the catalog is empty.",
      models: preset.models,
      resolvedBaseURL: discovered.resolvedBaseURL
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      models: preset.models
    };
  }
}

export { discoverRemoteModels } from "./discover";
