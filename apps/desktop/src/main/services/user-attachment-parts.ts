/**
 * 用户气泡附件：落库 parts 形状，以及旧消息按导入时间窗回挂。
 */

export type UserFileAsset = {
  assetId: string
  mediaType: string
  name: string
}

export type UserTurnPart =
  | { type: "text"; text: string }
  | { type: "file"; assetId: string; mediaType: string; name: string }

export type UserTurnHint = {
  id: string
  createdAt: number
  hasFileParts: boolean
}

export type ImportedAssetHint = {
  id: string
  name: string
  mediaType: string
  createdAt: number
}

/** Composer 导入后很快就发送；更早的库内资产不算本轮。 */
export const ORPHAN_ASSET_LOOKBACK_MS = 120_000

/** 用户轮次 parts：正文 text + 每个附件一条 file（给气泡回放，不表示发给模型的通道）。 */
export function userTurnParts(content: string, assets: UserFileAsset[]): UserTurnPart[] {
  const parts: UserTurnPart[] = []
  if (content.trim()) parts.push({ type: "text", text: content })
  for (const asset of assets) {
    parts.push({
      type: "file",
      assetId: asset.assetId,
      mediaType: asset.mediaType,
      name: asset.name
    })
  }
  return parts
}

export function linkedAssetIdsFromParts(parts: unknown[] | undefined): string[] {
  const ids: string[] = []
  for (const part of parts ?? []) {
    if (!part || typeof part !== "object") continue
    const record = part as Record<string, unknown>
    if (record.type === "file" && typeof record.assetId === "string") ids.push(record.assetId)
  }
  return ids
}

/**
 * 旧 persist 只写了 text：把「上一轮用户消息之后、本轮发送之前」导入的资产挂回本轮。
 * 已出现在任一 file part 的资产不再复用。
 */
export function matchOrphanedAssets(
  turns: UserTurnHint[],
  assets: ImportedAssetHint[],
  alreadyLinked: Set<string>
): Map<string, UserFileAsset[]> {
  const matched = new Map<string, UserFileAsset[]>()
  const linked = new Set(alreadyLinked)
  const ordered = [...turns].sort((a, b) => a.createdAt - b.createdAt)
  for (let i = 0; i < ordered.length; i++) {
    const turn = ordered[i]
    if (!turn || turn.hasFileParts) continue
    const prevAt = ordered[i - 1]?.createdAt ?? 0
    const windowStart = Math.max(prevAt, turn.createdAt - ORPHAN_ASSET_LOOKBACK_MS)
    const found: UserFileAsset[] = []
    for (const asset of assets) {
      if (linked.has(asset.id)) continue
      if (asset.createdAt <= windowStart || asset.createdAt > turn.createdAt) continue
      found.push({ assetId: asset.id, mediaType: asset.mediaType, name: asset.name })
      linked.add(asset.id)
    }
    if (found.length > 0) matched.set(turn.id, found)
  }
  return matched
}
