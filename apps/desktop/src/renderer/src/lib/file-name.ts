/**
 * 路径里的文件名与扩展名，给图标和语法高亮共用。
 */

/** 小写文件名，去掉目录。 */
export function fileNameOf(path: string): string {
  const normalized = path.replaceAll("\\", "/")
  const slash = normalized.lastIndexOf("/")
  return (slash >= 0 ? normalized.slice(slash + 1) : normalized).toLowerCase()
}

/** 扩展名；`foo.d.ts` 视为 `d.ts`。 */
export function extensionOf(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower.endsWith(".d.ts")) return "d.ts"
  const dot = lower.lastIndexOf(".")
  if (dot <= 0 || dot === lower.length - 1) return undefined
  return lower.slice(dot + 1)
}
