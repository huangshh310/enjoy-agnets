/**
 * 工作区指纹：Windows 上 fs.watch 漏事件时用轮询对比。
 */
import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])
const WALK_LIMIT = 200

export function shouldPollWorkspaceWatch(platform = process.platform): boolean {
  return platform === "win32"
}

export async function workspaceFingerprint(rootPath: string, limit = WALK_LIMIT): Promise<string> {
  const parts: string[] = []
  const queue = ["."]
  while (queue.length > 0 && parts.length < limit) {
    const rel = queue.shift()
    if (!rel) break
    const dir = rel === "." ? rootPath : join(rootPath, rel)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue
      const child = rel === "." ? entry.name : `${rel}/${entry.name}`
      try {
        const info = await stat(join(rootPath, child))
        parts.push(`${child}:${info.mtimeMs}:${info.size}`)
      } catch {
        continue
      }
      if (entry.isDirectory()) queue.push(child)
      if (parts.length >= limit) break
    }
  }
  return parts.sort().join("|")
}
