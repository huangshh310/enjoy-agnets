/**
 * 把上一轮写盘 path 与 Git 行统计对齐，供改动条展示。
 * 没有 Git 命中时仍列出文件，增减为 0，不要编造。
 */
import type { ChangedFileRow } from "@renderer/stores/chat-store.types"
import type { SessionReviewFile } from "./session-review.types"

export function collectSessionFiles(
  paths: string[],
  changes: ChangedFileRow[]
): SessionReviewFile[] {
  const seen: Record<string, true> = {}
  const files: SessionReviewFile[] = []
  for (const raw of paths) {
    const path = normalizePath(raw)
    if (!path || seen[path]) continue
    seen[path] = true
    const change = matchChange(path, changes)
    const resolved = change?.path ?? path
    files.push({
      path: resolved,
      name: fileName(resolved),
      additions: change?.additions ?? 0,
      deletions: change?.deletions ?? 0
    })
  }
  return files
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim()
}

function fileName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path
}

function matchChange(path: string, changes: ChangedFileRow[]): ChangedFileRow | undefined {
  const exact = changes.find((row) => normalizePath(row.path) === path)
  if (exact) return exact
  return changes.find((row) => {
    const other = normalizePath(row.path)
    return other.endsWith(`/${path}`) || path.endsWith(`/${other}`)
  })
}
