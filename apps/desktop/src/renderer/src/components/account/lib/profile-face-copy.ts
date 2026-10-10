/**
 * 资料页人话：平台名、钥匙串 / 系统密钥库、有无同比基数。
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

/** 只有钥匙串可用且已有密钥时才说已写入系统保管；否则空或中性。 */
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

/** 完整句：macOS 用钥匙串，其它平台用系统密钥库。三联卡只在一处用这句。 */
export function vaultCopyKey(face: VaultFace, apple: boolean): string {
  if (face === "keychain") {
    return apple
      ? "pages.account.security.vaultProtected"
      : "pages.account.security.vaultProtectedOther"
  }
  if (face === "empty") return "pages.account.security.vaultEmpty"
  return "pages.account.security.vaultNeutral"
}

/** Hero / 勋章用短句，避免同一页重复「密钥存在系统钥匙串」。 */
export function vaultChipKey(face: VaultFace): string {
  if (face === "empty") return "pages.account.security.vaultEmpty"
  return "pages.account.security.vaultSavedShort"
}
