/**
 * Harness 沙箱凭证（Vercel）。模型 API key 走 Providers 保险库，不在这里再存一份。
 */
import { safeStorage } from "electron"
import { HARNESS_ADAPTERS, resolveHarnessAdapter, type HarnessAdapter } from "@enjoy-agents/agent-harness"
import { getSecretValue, setSecretValue } from "@enjoy-agents/db"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { deleteSetting, getDatabase, getSetting } from "./database"
import { SecretWriteFailure, isSecretStorageAvailable } from "./secret-storage.ts"
import { findProfileByKinds, getActiveProfile } from "./secrets"

const HARNESS_KEY = "harness.secret"

export type HarnessSecret = {
  anthropicApiKey: string
  vercelToken: string
  vercelTeamId?: string
  vercelProjectId?: string
}

export type HarnessPublicStatus = SettingsSnapshot["harness"]

/** 给 Settings 用的公开状态：适配器 + Providers key + 可选沙箱。 */
export async function harnessPublicStatus(harnessId?: string): Promise<HarnessPublicStatus> {
  const active = await getActiveProfile()
  const adapter = resolveHarnessAdapter(harnessId, active?.kind)
  const secret = readHarnessSecret()
  const provider = adapter ? await findProfileByKinds(adapter.providerKinds) : undefined
  const hasProviderKey = Boolean(
    provider?.apiKey || (adapter?.id === "claude-code" && secret?.anthropicApiKey)
  )
  const hasSandboxToken = Boolean(secret?.vercelToken)
  const available = Boolean(adapter?.available)
  const comingSoon = Boolean(adapter?.comingSoon)
  const needsSandbox = Boolean(adapter?.needsSandbox)
  const needsProviderKey = adapter?.needsProviderKey !== false
  const ready =
    available && (!needsProviderKey || hasProviderKey) && (!needsSandbox || hasSandboxToken)
  return {
    adapterId: adapter?.id ?? null,
    adapterLabel: adapter?.label ?? "None",
    available,
    comingSoon,
    needsSandbox,
    usesProviderKey: needsProviderKey,
    hasProviderKey,
    hasSandboxToken,
    ready,
    blockedReason: blockedReason({ adapter, hasProviderKey, hasSandboxToken }),
    hasAnthropicKey: hasProviderKey,
    hasVercelToken: hasSandboxToken,
    catalog: HARNESS_ADAPTERS.map((item) => ({
      id: item.id,
      label: item.label,
      comingSoon: item.comingSoon
    }))
  }
}

function blockedReason(input: {
  adapter: HarnessAdapter | undefined
  hasProviderKey: boolean
  hasSandboxToken: boolean
}): string | null {
  if (!input.adapter) return "This provider has no Harness adapter. Local ToolLoop uses your Providers key."
  if (input.adapter.comingSoon || !input.adapter.available) {
    return `${input.adapter.label} Harness is not wired yet. Stay on Local (ToolLoop).`
  }
  if (input.adapter.needsProviderKey && !input.hasProviderKey) {
    const kind = input.adapter.providerKinds[0] ?? "matching"
    return `Add a ${kind} provider in Settings → Providers.`
  }
  if (input.adapter.needsSandbox && !input.hasSandboxToken) {
    return "This adapter still needs a sandbox isolation token (jail, not the model key)."
  }
  return null
}

/** 解密已存沙箱凭证；加密不可用或损坏时返回 null。 */
export function readHarnessSecret(): HarnessSecret | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  const raw = readHarnessBlob()
  if (!raw) return null
  try {
    const json = safeStorage.decryptString(Buffer.from(raw, "base64"))
    const parsed = JSON.parse(json) as Partial<HarnessSecret>
    if (!parsed.anthropicApiKey && !parsed.vercelToken) return null
    return {
      anthropicApiKey: parsed.anthropicApiKey ?? "",
      vercelToken: parsed.vercelToken ?? "",
      vercelTeamId: parsed.vercelTeamId,
      vercelProjectId: parsed.vercelProjectId
    }
  } catch {
    return null
  }
}

/** 合并后加密写入沙箱字段。模型 key 请写到 Providers。 */
export function writeHarnessSecret(patch: Partial<HarnessSecret>): HarnessSecret {
  if (!isSecretStorageAvailable()) {
    throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  }
  const current = readHarnessSecret()
  const next: HarnessSecret = {
    anthropicApiKey: pickSecret(patch.anthropicApiKey, current?.anthropicApiKey),
    vercelToken: pickSecret(patch.vercelToken, current?.vercelToken),
    vercelTeamId: patch.vercelTeamId ?? current?.vercelTeamId,
    vercelProjectId: patch.vercelProjectId ?? current?.vercelProjectId
  }
  setSecretValue(getDatabase(), HARNESS_KEY, safeStorage.encryptString(JSON.stringify(next)).toString("base64"))
  deleteSetting(HARNESS_KEY)
  return next
}

/** 密文已迁到 secrets_vault 专表；首次读到旧 settings 键时搬一次。 */
function readHarnessBlob(): string | undefined {
  const db = getDatabase()
  const current = getSecretValue(db, HARNESS_KEY)
  if (current) return current
  const legacy = getSetting(HARNESS_KEY)
  if (!legacy) return undefined
  setSecretValue(db, HARNESS_KEY, legacy)
  deleteSetting(HARNESS_KEY)
  return legacy
}

function pickSecret(next: string | undefined, prev: string | undefined): string {
  if (next === undefined) return prev ?? ""
  const trimmed = next.trim()
  return trimmed.length > 0 ? trimmed : prev ?? ""
}
