/**
 * 删档案拒绝：按档案 kind 查精选 preset。解不开密文就省略链接。
 */
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"
import { profileRevokeHint, type ProfileRevokeHint } from "./profile-revoke-hint.ts"
import { readVault, vaultCipherUnreadable } from "./secrets-vault.ts"

export async function revokeHintForProfileId(id: string): Promise<ProfileRevokeHint> {
  if (vaultCipherUnreadable()) return {}
  const profile = (await readVault()).profiles.find((row) => row.id === id)
  return profileRevokeHint(profile, PROVIDER_PRESETS)
}
