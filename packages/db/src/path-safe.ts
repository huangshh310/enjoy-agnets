/**
 * 路径安全：相对路径不得逃出根目录。
 */
import { isAbsolute, normalize, relative, resolve, sep } from "node:path"

export function assertInsideRoot(rootPath: string, relativePath: string): string {
  if (!relativePath || relativePath.includes("\0")) {
    throw new Error("Invalid path.")
  }
  if (isAbsolute(relativePath)) {
    throw new Error("Absolute paths are not allowed.")
  }
  const root = resolve(rootPath)
  const target = resolve(root, relativePath)
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`
  if (target !== root && !target.startsWith(prefix)) {
    throw new Error("Path escapes the workspace root.")
  }
  return normalize(target)
}

/** Knowledge 来源：校验后返回绝对路径与工作区内相对路径。 */
export function resolveKnowledgePath(root: string, rel: string): { abs: string; rel: string } {
  const abs = assertInsideRoot(root, rel)
  return { abs, rel: relative(root, abs).replace(/\\/g, "/") || "." }
}
