/**
 * 资产本地播放 URL：renderer 用自定义协议播视频，避免整段 base64 IPC。
 */

export const ASSET_PLAYBACK_SCHEME = "enjoy-asset"

const ASSET_ID = /^ast_[0-9a-fA-F-]+$/

export function assetPlaybackUrl(assetId: string): string {
  return `${ASSET_PLAYBACK_SCHEME}://local/${encodeURIComponent(assetId)}`
}

export function parseAssetPlaybackId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== `${ASSET_PLAYBACK_SCHEME}:`) return null
    const id = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
    return ASSET_ID.test(id) ? id : null
  } catch {
    return null
  }
}
