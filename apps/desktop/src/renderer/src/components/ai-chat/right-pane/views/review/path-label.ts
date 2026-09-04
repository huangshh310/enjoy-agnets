/**
 * 审查文件行：目录与文件名分开显示。
 */
export function splitReviewPath(path: string): { dir: string; name: string } {
  const normalized = path.replaceAll("\\", "/")
  const slash = normalized.lastIndexOf("/")
  if (slash < 0) return { dir: "", name: normalized }
  return { dir: normalized.slice(0, slash), name: normalized.slice(slash + 1) }
}
