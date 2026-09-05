/**
 * 把系统选择器的绝对路径收成工作区相对路径。盘符大小写不当外部目录。
 */
export function toWorkspaceRelativePath(root: string, picked: string): string | null {
  const norm = (value: string) => value.replace(/\\/g, "/").replace(/\/+$/, "")
  const rootNorm = norm(root)
  const pickedNorm = norm(picked)
  if (!rootNorm || !pickedNorm) return null
  if (rootNorm.toLowerCase() === pickedNorm.toLowerCase()) return "."
  const prefix = `${rootNorm.toLowerCase()}/`
  if (!pickedNorm.toLowerCase().startsWith(prefix)) return null
  return pickedNorm.slice(rootNorm.length + 1)
}

export type PickedRelative =
  | { status: "ok"; path: string }
  | { status: "cancel" }
  | { status: "outside" }

export function pickedPathToRelative(rootPath: string, pickedPath?: string | null): PickedRelative {
  if (!pickedPath?.trim()) return { status: "cancel" }
  const relative = toWorkspaceRelativePath(rootPath, pickedPath)
  if (!relative) return { status: "outside" }
  return { status: "ok", path: relative }
}
