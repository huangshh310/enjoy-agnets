/**
 * 删档案怎么动 vault：叶子，行为测可直接 value-import。
 * 钥匙串挂了：删完一张都不剩才整行清掉；只要还剩档案就拒绝。
 */

export type VaultDeleteRow = {
  id: string
  apiKey?: string
  enabled?: boolean
  keys?: Array<{ apiKey?: string }>
  customHeaders?: string
  customBody?: string
  proxy?: string
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
  if (profile.keys?.some((key) => key.apiKey?.trim())) return true
  if (profile.proxy?.trim()) return true
  return jsonHoldsSecret(profile.customHeaders) || jsonHoldsSecret(profile.customBody)
}

export function planVaultDelete<T extends VaultDeleteRow>(
  vault: VaultDeleteState<T>,
  id: string,
  storageAvailable: boolean
): VaultDeletePlan<T> {
  if (!vault.profiles.some((profile) => profile.id === id)) return { kind: "missing" }
  const remaining = vault.profiles.filter((profile) => profile.id !== id)
  if (!storageAvailable) {
    return remaining.length === 0 ? { kind: "clear" } : { kind: "refuse" }
  }
  return {
    kind: "rewrite",
    vault: {
      profiles: remaining,
      activeId: vault.activeId === id ? (remaining.find((item) => item.enabled)?.id ?? null) : vault.activeId
    }
  }
}

function jsonHoldsSecret(raw?: string): boolean {
  if (!raw?.trim()) return false
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return String(parsed).trim().length > 0
    return Object.values(parsed).some((value) => typeof value === "string" && value.trim().length > 0)
  } catch {
    return raw.trim().length > 0
  }
}
