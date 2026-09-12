/**
 * 供应商 vault：safeStorage 加解密、遗留 Key 迁移、对外脱敏。
 */
import { safeStorage } from "electron"
import {
  getSecretValue,
  setSecretValue,
} from "@enjoy-agents/db"
import {
  isApiStyle,
  presetFor,
  type ApiStyle,
  type CatalogModel,
  type ProviderKind
} from "@enjoy-agents/providers"
import { deleteSetting, getDatabase, getSetting } from "./database"
import { createId } from "./ids"

const LEGACY_SECRET_KEY = "provider.secret"
const VAULT_KEY = "provider.vault"

export type StoredSecret = {
  provider: ProviderKind
  apiKey: string
  baseURL?: string
  modelId?: string
  apiStyle?: ApiStyle
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  customHeaders?: string
  customBody?: string
  models?: CatalogModel[]
}

export type ProviderProfile = {
  id: string
  name: string
  kind: ProviderKind
  apiKey: string
  baseURL: string
  modelId: string
  apiStyle: ApiStyle
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  customHeaders?: string
  customBody?: string
  models?: CatalogModel[]
}

export type ProviderPublic = {
  id: string
  name: string
  kind: ProviderKind
  baseURL: string
  modelId: string
  apiStyle: ApiStyle
  fastModelId?: string
  reasoningModelId?: string
  contextWindow?: number
  maxTokens?: number
  temperature?: number
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  customHeaders?: string
  customBody?: string
  models?: CatalogModel[]
  hasKey: boolean
  keyHint: string
  active: boolean
  requiresKey: boolean
}

export type Vault = {
  activeId: string | null
  profiles: ProviderProfile[]
}

export function resolvedStyle(profile: Pick<ProviderProfile, "kind" | "apiStyle">): ApiStyle {
  return isApiStyle(profile.apiStyle) ? profile.apiStyle : presetFor(profile.kind).apiStyle
}

export function toPublic(profile: ProviderProfile, activeId: string | null): ProviderPublic {
  const preset = presetFor(profile.kind)
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
  }
}

export async function readVault(): Promise<Vault> {
  const stored = readVaultBlob()
  if (stored) return decryptJson<Vault>(stored) ?? emptyVault()
  const migrated = migrateLegacySecret()
  if (migrated) {
    await writeVault(migrated)
    return migrated
  }
  return emptyVault()
}

export async function writeVault(vault: Vault): Promise<void> {
  setSecretValue(getDatabase(), VAULT_KEY, encryptJson(vault))
  // 惰性清理 settings KV 里的旧位置；键不存在时无害。
  deleteSetting(VAULT_KEY)
}

/** vault 密文已迁到 secrets_vault 专表；首次读到旧 settings 键时搬一次。 */
function readVaultBlob(): string | undefined {
  const db = getDatabase()
  const current = getSecretValue(db, VAULT_KEY)
  if (current) return current
  const legacy = getSetting(VAULT_KEY)
  if (!legacy) return undefined
  setSecretValue(db, VAULT_KEY, legacy)
  deleteSetting(VAULT_KEY)
  return legacy
}

function encryptJson(value: unknown): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS keychain encryption is not available on this machine.")
  }
  return safeStorage.encryptString(JSON.stringify(value)).toString("base64")
}

function decryptJson<T>(stored: string): T | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined
  try {
    return JSON.parse(safeStorage.decryptString(Buffer.from(stored, "base64"))) as T
  } catch {
    return undefined
  }
}

/** spec 要求 `••••` + 后四位；短 Key / 非可见字符退回纯掩码，避免泄漏长度信息过多。 */
function keyHint(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) return ""
  const tail = trimmed.slice(-4)
  return /^[A-Za-z0-9_-]{4}$/.test(tail) ? `••••${tail}` : "••••"
}

function emptyVault(): Vault {
  return { activeId: null, profiles: [] }
}

function migrateLegacySecret(): Vault | undefined {
  const stored = getSetting(LEGACY_SECRET_KEY)
  if (!stored) return undefined
  const legacy = decryptJson<StoredSecret>(stored)
  if (!legacy?.apiKey) return undefined
  const preset = presetFor(legacy.provider)
  const profile: ProviderProfile = {
    id: createId("prv"),
    name: preset.name,
    kind: legacy.provider,
    apiKey: legacy.apiKey,
    baseURL: legacy.baseURL ?? preset.defaultBaseURL,
    modelId: legacy.modelId ?? preset.models[0]?.id ?? "",
    apiStyle: preset.apiStyle
  }
  return { activeId: profile.id, profiles: [profile] }
}
