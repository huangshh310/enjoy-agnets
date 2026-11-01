/**
 * 删供应商档案。叶子：行为测可直接 value-import，不经过 secrets 桶。
 * unbind 对齐 tip `unbindProviderFromAgentTools`（同 key / 同纯函数），不 import 重模块以免拖 ACP。
 */
import { AGENT_TOOL_OVERRIDES_KEY, readAgentToolOverrides } from "./agent-tools-overrides-read.ts"
import { unbindProviderInOverrides } from "./agent-tools-unbind.ts"
import { clearCredentialCheck } from "./credential-check-store.ts"
import { setSetting } from "./database.ts"
import { SecretWriteFailure, isSecretStorageAvailable } from "./secret-storage.ts"
import { clearVault, readVault, vaultCipherUnreadable, writeVault } from "./secrets-vault.ts"
import { planVaultDelete } from "./vault-delete.ts"

export async function removeProfile(id: string): Promise<void> {
  // 换机 / 解不开密文：钥匙串就算可用也拒绝，readVault 空包会走 missing 假成功。
  if (vaultCipherUnreadable()) {
    throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  }
  const storageAvailable = isSecretStorageAvailable()
  const plan = planVaultDelete(await readVault(), id, storageAvailable)
  if (plan.kind === "missing") return
  if (plan.kind === "refuse") throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  unbindDeletedProvider(id)
  clearCredentialCheck(id)
  if (plan.kind === "clear") {
    clearVault()
    return
  }
  await writeVault(plan.vault)
}

function unbindDeletedProvider(providerId: string): void {
  const { next, changed } = unbindProviderInOverrides(readAgentToolOverrides(), providerId)
  if (changed) setSetting(AGENT_TOOL_OVERRIDES_KEY, JSON.stringify(next))
}
