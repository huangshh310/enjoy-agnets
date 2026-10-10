/**
 * 删档案拒绝时的作废链接：只取精选 preset 的 keysURL / 文档首页。
 * 禁止用户 baseURL；custom 一律没有；非 https 丢掉。
 */
export type CuratedRevokePreset = {
  kind: string
  name: string
  keysURL?: string
  docsURL?: string
  regions?: Array<{ id: string; keysURL?: string; docsURL?: string }>
}

export type ProfileRevokeHint = {
  revokeUrl?: string
  providerLabel?: string
}

export function profileRevokeHint(
  profile: { kind?: string; regionId?: string; baseURL?: string } | undefined,
  presets: readonly CuratedRevokePreset[]
): ProfileRevokeHint {
  const kind = profile?.kind
  if (!kind || kind === "custom") return {}
  const preset = presets.find((row) => row.kind === kind)
  if (!preset || preset.kind === "custom") return {}
  const region = profile.regionId
    ? preset.regions?.find((row) => row.id === profile.regionId)
    : undefined
  const revokeUrl =
    httpsOnly(region?.keysURL) ??
    httpsOnly(preset.keysURL) ??
    httpsOnly(region?.docsURL) ??
    httpsOnly(preset.docsURL)
  return {
    ...(revokeUrl ? { revokeUrl } : {}),
    providerLabel: preset.name
  }
}

function httpsOnly(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    return url.href
  } catch {
    return undefined
  }
}
