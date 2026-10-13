/**
 * 改动条出现条件：有写盘 path 或正在跑；Keep/Undo 后按文件集合隐藏。
 */

export function reviewFilesKey(paths: string[]): string {
  return [...new Set(paths.filter(Boolean))].sort().join("\n")
}

export function sessionReviewVisible(
  fileCount: number,
  running: boolean,
  dismissedKey?: string | null,
  filesKey?: string,
  messageCount?: number,
  needsReview?: boolean,
  /** 库里 workflow=done（已「通过」）。通过的收起只记在内存，重启后靠它，不再冒「N 个文件已改」。 */
  approved?: boolean
): boolean {
  if (messageCount === 0) return false
  if (approved && !running) return false
  if (needsReview && !running) return true
  if (dismissedKey != null && filesKey != null && dismissedKey === filesKey) return false
  if (fileCount > 0) return true
  return running
}

/** 只有本轮写盘、且 2–6 个文件时默认展开；否则一行 pill。 */
export function shouldExpandReviewFiles(fromLastTurn: boolean, fileCount: number): boolean {
  return fromLastTurn && fileCount > 1 && fileCount <= 6
}
