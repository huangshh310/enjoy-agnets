/**
 * 删档案怎么动 vault：叶子，行为测可直接 value-import。
 * 钥匙串挂了：还有别的密钥就拒绝；最后一把整行清掉。
 */

export type VaultDeleteRow = {
  id: string
  apiKey?: string
  enabled?: boolean
  keys?: Array<{ apiKey?: string }>
}

export type VaultDeleteState<T extends VaultDeleteRow> = {
  activeId: string | null
  profiles: T[]
}

export type VaultDeletePlan<T extends VaultDeleteRow> =
  | { kind: "missing" }
  | { kind: "refuse" }
  | { kind: "clear" }
  | { kind: "rewrite"; vault: VaultDeleteState<T> }

export function profileHasSecret(profile: VaultDeleteRow): boolean {
  if (profile.apiKey?.trim()) return true
  return Boolean(profile.keys?.some((key) => key.apiKey?.trim()))
}

export function planVaultDelete<T extends VaultDeleteRow>(
  vault: VaultDeleteState<T>,
  id: string,
  storageAvailable: boolean
): VaultDeletePlan<T> {
  if (!vault.profiles.some((profile) => profile.id === id)) return { kind: "missing" }
  const remaining = vault.profiles.filter((profile) => profile.id !== id)
  const remainingKeyed = remaining.filter(profileHasSecret)
  if (remainingKeyed.length > 0 && !storageAvailable) return { kind: "refuse" }
  if (remainingKeyed.length === 0 && !storageAvailable) return { kind: "clear" }
  return {
    kind: "rewrite",
    vault: {
      profiles: remaining,
      activeId: vault.activeId === id ? (remaining.find((item) => item.enabled)?.id ?? null) : vault.activeId
    }
  }
}
