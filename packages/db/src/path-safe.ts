/**
 * 路径安全：相对路径不得逃出根目录。Windows 盘符大小写视为同一根。
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
  if (!isInsideRoot(root, target)) {
    throw new Error("Path escapes the workspace root.")
  }
  return normalize(target)
}

/** Knowledge 来源：校验后返回绝对路径与工作区内相对路径。根外绝对路径即拒。 */
export function resolveKnowledgePath(root: string, rel: string): { abs: string; rel: string } {
  if (!rel || rel.includes("\0")) {
    throw new Error("Invalid path.")
  }
  if (isAbsolute(rel)) {
    const rootNorm = resolve(root)
    const absNorm = normalize(resolve(rel))
    if (!isInsideRoot(rootNorm, absNorm)) {
      throw new Error("Path escapes the workspace root.")
    }
    return { abs: absNorm, rel: toWorkspaceRel(rootNorm, absNorm) }
  }
  const abs = assertInsideRoot(root, rel)
  return { abs, rel: relative(root, abs).replace(/\\/g, "/") || "." }
}

function pathsEqual(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right
}

function isInsideRoot(rootNorm: string, absNorm: string): boolean {
  if (pathsEqual(rootNorm, absNorm)) return true
  const root = process.platform === "win32" ? rootNorm.toLowerCase() : rootNorm
  const abs = process.platform === "win32" ? absNorm.toLowerCase() : absNorm
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`
  return abs.startsWith(prefix)
}

function toWorkspaceRel(rootNorm: string, absNorm: string): string {
  if (pathsEqual(rootNorm, absNorm)) return "."
  const rel = relative(rootNorm, absNorm).replace(/\\/g, "/")
  if (rel && !rel.startsWith("..") && !isAbsolute(rel)) return rel
  const rootSlash = rootNorm.replace(/\\/g, "/")
  const absSlash = absNorm.replace(/\\/g, "/")
  const rootCmp = process.platform === "win32" ? rootSlash.toLowerCase() : rootSlash
  const absCmp = process.platform === "win32" ? absSlash.toLowerCase() : absSlash
  const prefix = rootCmp.endsWith("/") ? rootCmp : `${rootCmp}/`
  if (absCmp === rootCmp) return "."
  if (absCmp.startsWith(prefix)) return absSlash.slice(prefix.length)
  throw new Error("Path escapes the workspace root.")
}
