/**
 * 资料页人话：平台名、钥匙串状态、有无同比基数。
 */

export type VaultFace = "keychain" | "empty" | "neutral"

/** 从 navigator.platform / UA 抽出 Windows / macOS / Linux，认不出则空。 */
export function profileOsName(raw: string | undefined): string | null {
  const text = (raw ?? "").toLowerCase()
  if (text.includes("win")) return "Windows"
  if (text.includes("mac") || text.includes("darwin")) return "macOS"
  if (text.includes("linux")) return "Linux"
  return null
}

/** 只有钥匙串可用且已有密钥时才说「在钥匙串」；否则空或中性。 */
export function vaultFace(input: {
  hasKey: boolean
  secretStorageAvailable?: boolean
}): VaultFace {
  if (!input.hasKey) return "empty"
  if (input.secretStorageAvailable === true) return "keychain"
  return "neutral"
}

export function hasGrowthBase(label: string): boolean {
  return label.length > 0
}

export function vaultCopyKey(face: VaultFace): string {
  if (face === "keychain") return "pages.account.security.vaultProtected"
  if (face === "empty") return "pages.account.security.vaultEmpty"
  return "pages.account.security.vaultNeutral"
}
