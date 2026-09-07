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
  filesKey?: string
): boolean {
  if (dismissedKey != null && filesKey != null && dismissedKey === filesKey) return false
  if (fileCount > 0) return true
  return running
}
