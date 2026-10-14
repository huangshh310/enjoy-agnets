/**
 * 同一会话短时间内相同用户句不重复 INSERT（连点发送 / persist 双写）。
 * 去重键 = 正文 + 附件 id 集合（#155 leo MUST 2）：8s 内连发两张不同的图（正文都为空）不能当成重复。
 */

export const DUPLICATE_USER_TURN_MS = 8000

export function shouldSkipDuplicateUserTurn(
  last: { content: string; createdAt: number; assetIds?: string[] } | undefined,
  content: string,
  now: number,
  windowMs = DUPLICATE_USER_TURN_MS,
  assetIds: string[] = []
): boolean {
  if (!last) return false
  if (last.content !== content || now - last.createdAt >= windowMs) return false
  return sameAssetSet(last.assetIds ?? [], assetIds)
}

function sameAssetSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((id, index) => id === right[index])
}
