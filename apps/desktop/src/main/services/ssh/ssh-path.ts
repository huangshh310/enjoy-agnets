/**
 * 远端路径 jail：相对路径锁在 remote_path 内，POSIX 语义。
 */
import { posix } from "node:path"

export function resolveRemoteJail(remoteRoot: string, relativePath: string): string {
  const root = normalizeRoot(remoteRoot)
  const raw = relativePath.trim() || "."
  const joined = raw.startsWith("/") ? posix.normalize(raw) : posix.normalize(posix.join(root, raw))
  const rel = posix.relative(root, joined)
  if (rel.startsWith("..") || posix.isAbsolute(rel) || (raw.startsWith("/") && joined !== root && !joined.startsWith(`${root}/`))) {
    throw new Error(`Path escapes the workspace: ${relativePath}`)
  }
  return joined === "" ? root : joined
}

export function toRemoteRelative(remoteRoot: string, absPath: string): string {
  const root = normalizeRoot(remoteRoot)
  const rel = posix.relative(root, posix.normalize(absPath))
  return rel === "" ? "." : rel.split("\\").join("/")
}

function normalizeRoot(remoteRoot: string): string {
  const trimmed = remoteRoot.trim() || "/"
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  const normalized = posix.normalize(withSlash)
  return normalized === "/" ? "/" : normalized.replace(/\/$/, "")
}

export function quoteRemote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}
