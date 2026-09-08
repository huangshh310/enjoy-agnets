/**
 * 工作区显示名：显式名称优先，否则用路径最后一段（兼容 / 与 \）。
 */
export function resolveWorkspaceName(rootPath: string, name?: string): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  const normalized = rootPath.replace(/[\\/]+$/, "")
  return normalized.split(/[\\/]/).at(-1) || rootPath
}
