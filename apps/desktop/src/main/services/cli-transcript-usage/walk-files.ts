/**
 * 每次调用独立计数的文件列举。相对 root 的路径交给 adapter 谓词。
 */
import { existsSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

export function walkMatchingFiles(input: {
  roots: string[]
  matchRelPath: (relPath: string) => boolean
  maxFiles: number
}): string[] {
  const out: string[] = []
  for (const root of input.roots) {
    walkDir(root, root, out, input.matchRelPath, input.maxFiles)
  }
  return out
}

function walkDir(
  root: string,
  dir: string,
  out: string[],
  matchRelPath: (relPath: string) => boolean,
  maxFiles: number
): void {
  if (out.length >= maxFiles || !existsSync(dir)) return
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (out.length >= maxFiles) return
    const full = join(dir, name)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      walkDir(root, full, out, matchRelPath, maxFiles)
      continue
    }
    if (!stat.isFile()) continue
    const relPath = relative(root, full).replaceAll("\\", "/")
    if (matchRelPath(relPath)) out.push(full)
  }
}

export function toRelPath(root: string, filePath: string): string {
  return relative(root, filePath).replaceAll("\\", "/")
}
