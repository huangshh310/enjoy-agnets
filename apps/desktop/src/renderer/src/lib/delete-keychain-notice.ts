/**
 * 删档案 KEYCHAIN_UNAVAILABLE：对话框内提示，不是 toast。
 * 精选有 keysURL 才出「去作废」；自定义走通用句、无链接。
 */
export type DeleteKeychainNoticeHint = {
  revokeUrl?: string
  providerLabel?: string
}

export type DeleteKeychainNoticeModel = {
  unavailableKey: "settings.providers.deleteKeychainUnavailable"
  hintKey: "settings.providers.deleteRevokeHint" | "settings.providers.deleteRevokeHintGeneric"
  linkKey?: "settings.providers.deleteRevokeLink"
  provider?: string
  revokeUrl?: string
}

export function deleteKeychainNoticeModel(hint: DeleteKeychainNoticeHint = {}): DeleteKeychainNoticeModel {
  if (hint.providerLabel) {
    return {
      unavailableKey: "settings.providers.deleteKeychainUnavailable",
      hintKey: "settings.providers.deleteRevokeHint",
      provider: hint.providerLabel,
      ...(hint.revokeUrl
        ? { linkKey: "settings.providers.deleteRevokeLink", revokeUrl: hint.revokeUrl }
        : {})
    }
  }
  return {
    unavailableKey: "settings.providers.deleteKeychainUnavailable",
    hintKey: "settings.providers.deleteRevokeHintGeneric"
  }
}
