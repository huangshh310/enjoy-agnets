import { safeStorage } from "electron";
import {
  isApiStyle,
  modelsForProvider,
  presetFor,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind
} from "@enjoy-agents/providers";
import { getSetting, setSetting } from "./database";
import { createId } from "./ids";

const LEGACY_SECRET_KEY = "provider.secret";
const VAULT_KEY = "provider.vault";

export type StoredSecret = {
  provider: ProviderKind;
  apiKey: string;
  baseURL?: string;
  modelId?: string;
  apiStyle?: ApiStyle;
  fastModelId?: string;
  reasoningModelId?: string;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  customHeaders?: string;
  customBody?: string;
  models?: CatalogModel[];
};

export type ProviderProfile = {
  id: string;
  name: string;
  kind: ProviderKind;
  apiKey: string;
  baseURL: string;
  modelId: string;
  apiStyle: ApiStyle;
  fastModelId?: string;
  reasoningModelId?: string;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  customHeaders?: string;
  customBody?: string;
  models?: CatalogModel[];
};

export type ProviderPublic = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseURL: string;
  modelId: string;
  apiStyle: ApiStyle;
  fastModelId?: string;
  reasoningModelId?: string;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  customHeaders?: string;
  customBody?: string;
  models?: CatalogModel[];
  hasKey: boolean;
  keyHint: string;
  active: boolean;
  requiresKey: boolean;
};

type Vault = {
  activeId: string | null;
  profiles: ProviderProfile[];
};

function encryptJson(value: unknown): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS keychain encryption is not available on this machine.");
  }
  return safeStorage.encryptString(JSON.stringify(value)).toString("base64");
}

function decryptJson<T>(stored: string): T | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined;
  try {
    return JSON.parse(safeStorage.decryptString(Buffer.from(stored, "base64"))) as T;
  } catch {
    return undefined;
  }
}

function keyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

function resolvedStyle(profile: Pick<ProviderProfile, "kind" | "apiStyle">): ApiStyle {
  return isApiStyle(profile.apiStyle) ? profile.apiStyle : presetFor(profile.kind).apiStyle;
}

function toPublic(profile: ProviderProfile, activeId: string | null): ProviderPublic {
  const preset = presetFor(profile.kind);
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    baseURL: profile.baseURL,
    modelId: profile.modelId,
    apiStyle: resolvedStyle(profile),
    fastModelId: profile.fastModelId,
    reasoningModelId: profile.reasoningModelId,
    contextWindow: profile.contextWindow,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    reasoningEffort: profile.reasoningEffort,
    customHeaders: profile.customHeaders,
    customBody: profile.customBody,
    models: profile.models,
    hasKey: Boolean(profile.apiKey),
    keyHint: keyHint(profile.apiKey),
    active: profile.id === activeId,
    requiresKey: preset.requiresKey
  };
}

function emptyVault(): Vault {
  return { activeId: null, profiles: [] };
}

function migrateLegacySecret(): Vault | undefined {
  const stored = getSetting(LEGACY_SECRET_KEY);
  if (!stored) return undefined;
  const legacy = decryptJson<StoredSecret>(stored);
  if (!legacy?.apiKey) return undefined;
  const preset = presetFor(legacy.provider);
  const profile: ProviderProfile = {
    id: createId("prv"),
    name: preset.name,
    kind: legacy.provider,
    apiKey: legacy.apiKey,
    baseURL: legacy.baseURL ?? preset.defaultBaseURL,
    modelId: legacy.modelId ?? preset.models[0]?.id ?? "",
    apiStyle: preset.apiStyle
  };
  return { activeId: profile.id, profiles: [profile] };
}

export async function readVault(): Promise<Vault> {
  const stored = getSetting(VAULT_KEY);
  if (stored) {
    return decryptJson<Vault>(stored) ?? emptyVault();
  }
  const migrated = migrateLegacySecret();
  if (migrated) {
    await writeVault(migrated);
    return migrated;
  }
  return emptyVault();
}

export async function writeVault(vault: Vault): Promise<void> {
  setSetting(VAULT_KEY, encryptJson(vault));
}

export async function listPublicProviders(): Promise<ProviderPublic[]> {
  const vault = await readVault();
  return vault.profiles.map((profile) => toPublic(profile, vault.activeId));
}

export async function getActiveProfile(): Promise<ProviderProfile | undefined> {
  const vault = await readVault();
  return vault.profiles.find((profile) => profile.id === vault.activeId) ?? vault.profiles[0];
}

export async function upsertProfile(input: {
  id?: string;
  name: string;
  kind: ProviderKind;
  apiKey?: string;
  baseURL?: string;
  modelId?: string;
  apiStyle?: string;
  fastModelId?: string;
  reasoningModelId?: string;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  customHeaders?: string;
  customBody?: string;
  models?: CatalogModel[];
  activate?: boolean;
}): Promise<ProviderPublic> {
  const vault = await readVault();
  const preset = presetFor(input.kind);
  const existing = input.id ? vault.profiles.find((profile) => profile.id === input.id) : undefined;
  const id = existing?.id ?? createId("prv");
  const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : (existing?.apiKey ?? "");
  if (preset.requiresKey && !apiKey) {
    throw new Error("API key is required for this provider.");
  }
  const profile: ProviderProfile = {
    id,
    name: input.name.trim() || preset.name,
    kind: input.kind,
    apiKey,
    baseURL: (input.baseURL ?? existing?.baseURL ?? preset.defaultBaseURL).trim(),
    modelId: (input.modelId ?? existing?.modelId ?? preset.models[0]?.id ?? "").trim(),
    apiStyle: isApiStyle(input.apiStyle)
      ? input.apiStyle
      : resolvedStyle({ kind: input.kind, apiStyle: existing?.apiStyle ?? preset.apiStyle }),
    fastModelId: input.fastModelId ?? existing?.fastModelId,
    reasoningModelId: input.reasoningModelId ?? existing?.reasoningModelId,
    contextWindow: input.contextWindow ?? existing?.contextWindow,
    maxTokens: input.maxTokens ?? existing?.maxTokens,
    temperature: input.temperature ?? existing?.temperature,
    reasoningEffort: input.reasoningEffort ?? existing?.reasoningEffort,
    customHeaders: input.customHeaders ?? existing?.customHeaders,
    customBody: input.customBody ?? existing?.customBody,
    models: input.models ?? existing?.models
  };
  vault.profiles = existing
    ? vault.profiles.map((item) => (item.id === id ? profile : item))
    : [profile, ...vault.profiles];
  if (input.activate !== false || !vault.activeId) {
    vault.activeId = id;
  }
  await writeVault(vault);
  return toPublic(profile, vault.activeId);
}

export async function removeProfile(id: string): Promise<void> {
  const vault = await readVault();
  vault.profiles = vault.profiles.filter((profile) => profile.id !== id);
  if (vault.activeId === id) {
    vault.activeId = vault.profiles[0]?.id ?? null;
  }
  await writeVault(vault);
}

export async function activateProfile(id: string): Promise<ProviderPublic> {
  const vault = await readVault();
  const profile = vault.profiles.find((item) => item.id === id);
  if (!profile) throw new Error("Unknown provider.");
  vault.activeId = id;
  await writeVault(vault);
  return toPublic(profile, id);
}

export async function saveSecret(secret: StoredSecret): Promise<void> {
  const preset = presetFor(secret.provider);
  await upsertProfile({
    name: preset.name,
    kind: secret.provider,
    apiKey: secret.apiKey,
    baseURL: secret.baseURL,
    modelId: secret.modelId,
    activate: true
  });
}

export async function readSecret(): Promise<StoredSecret | undefined> {
  const profile = await getActiveProfile();
  if (!profile) return undefined;
  return {
    provider: profile.kind,
    apiKey: profile.apiKey,
    baseURL: profile.baseURL,
    modelId: profile.modelId,
    apiStyle: resolvedStyle(profile),
    fastModelId: profile.fastModelId,
    reasoningModelId: profile.reasoningModelId,
    contextWindow: profile.contextWindow,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
    reasoningEffort: profile.reasoningEffort,
    customHeaders: profile.customHeaders,
    customBody: profile.customBody,
    models: profile.models
  };
}

export async function hasSecret(): Promise<boolean> {
  const profile = await getActiveProfile();
  if (!profile) return false;
  return presetFor(profile.kind).requiresKey ? Boolean(profile.apiKey) : true;
}

export function publicModelsFor(profile: ProviderProfile | undefined) {
  if (!profile) return [];
  return modelsForProvider(profile.kind, profile.modelId, profile.models).map((model) => ({
    id: model.id,
    label: model.label,
    provider: profile.kind
  }));
}
