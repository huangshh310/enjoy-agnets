/**
 * 用户气泡附件：落库 parts 形状。（读时按导入时间窗回挂已在 #153 移除：会把别的会话的图挂进来。）
 */

export type UserFileAsset = {
  assetId: string
  mediaType: string
  name: string
}

export type UserTurnPart =
  | { type: "text"; text: string }
  | { type: "file"; assetId: string; mediaType: string; name: string }

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
