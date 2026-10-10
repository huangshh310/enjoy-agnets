/**
 * 删供应商档案。叶子：行为测可直接 value-import，不经过 secrets 桶。
 */
import { unbindProviderInOverrides } from "./agent-tools-unbind.ts"
import { getSetting, setSetting } from "./database.ts"
import { SecretWriteFailure, isSecretStorageAvailable } from "./secret-storage.ts"
import { clearVault, readVault, vaultCipherUnreadable, writeVault } from "./secrets-vault.ts"
import { planVaultDelete } from "./vault-delete.ts"

const OVERRIDE_KEY = "agentTools.overrides"

export async function removeProfile(id: string): Promise<void> {
  const storageAvailable = isSecretStorageAvailable()
  if (!storageAvailable && vaultCipherUnreadable()) {
    throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  }
  const plan = planVaultDelete(await readVault(), id, storageAvailable)
  if (plan.kind === "missing") return
  if (plan.kind === "refuse") throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  unbindDeletedProvider(id)
  if (plan.kind === "clear") {
    clearVault()
    return
  }
  await writeVault(plan.vault)
}

function unbindDeletedProvider(providerId: string): void {
  const raw = getSetting(OVERRIDE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, { providerId?: string }>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return
    const { next, changed } = unbindProviderInOverrides(parsed, providerId)
    if (changed) setSetting(OVERRIDE_KEY, JSON.stringify(next))
  } catch {
    // 坏覆盖不挡删档。
  }
}
