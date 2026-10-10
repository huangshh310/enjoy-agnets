/**
 * 删档案 KEYCHAIN_UNAVAILABLE toast：原句 + 作废提示；有 https 才给「去作废」。
 * 文案键是占位，luna 定稿。
 */
export function deleteBlockedToastModel(
  t: (path: string) => string,
  revokeUrl?: string
): { message: string; actionLabel?: string; revokeUrl?: string } {
  const message = `${t("settings.secretWrite.deleteBlockedKeychain")} ${t("settings.secretWrite.deleteBlockedRevokeHint")}`
  if (!revokeUrl) return { message }
  return {
    message,
    actionLabel: t("settings.secretWrite.deleteBlockedRevokeAction"),
    revokeUrl
  }
}
