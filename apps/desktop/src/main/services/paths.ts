/**
 * 工作区路径 jail：相对路径锁在根内，并跟随已存在路径上的符号链接。
 */
import { existsSync, realpathSync } from "node:fs"
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path"

export function resolveInsideWorkspace(workspaceRoot: string, candidate: string): string {
  const root = realpathSync(workspaceRoot)
  const absolute = isAbsolute(candidate) ? normalize(candidate) : resolve(workspaceRoot, candidate)
  const resolved = followExisting(absolute)
  const relativePath = relative(root, resolved)
  if (relativePath.startsWith("..") || relativePath.startsWith(sep) || isAbsolute(relativePath)) {
    throw new Error(`Path escapes the workspace: ${candidate}`)
  }
  return resolved
}

export function toWorkspaceRelative(workspaceRoot: string, absolutePath: string): string {
  const root = existsSync(workspaceRoot) ? realpathSync(workspaceRoot) : workspaceRoot
  // 两边都跟已存在前缀的 realpath：macOS `/tmp` → `/private/tmp`，只解析根会算出 `../../../tmp/...`
  const abs = followExisting(absolutePath)
  return relative(root, abs).split(sep).join("/")
}

export function joinWorkspace(workspaceRoot: string, relativePath: string): string {
  return join(workspaceRoot, relativePath)
}

function followExisting(absolute: string): string {
  const missing: string[] = []
  let probe = absolute
  while (!existsSync(probe)) {
    const parent = dirname(probe)
    if (parent === probe) break
    missing.unshift(basename(probe))
    probe = parent
  }
  const base = existsSync(probe) ? realpathSync(probe) : probe
  return missing.length > 0 ? join(base, ...missing) : base
}
