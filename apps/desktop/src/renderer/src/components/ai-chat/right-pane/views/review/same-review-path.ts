/**
 * 审查路径对齐：相对 path 与 Git 行可能一个带目录、一个是文件名。
 */
export function normalizeReviewPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim()
}

export function sameReviewPath(left: string, right: string): boolean {
  const a = normalizeReviewPath(left)
  const b = normalizeReviewPath(right)
  if (!a || !b) return false
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`)
}
