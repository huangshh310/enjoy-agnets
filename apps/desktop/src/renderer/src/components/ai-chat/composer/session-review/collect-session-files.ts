/**
 * 把上一轮写盘 path 与 Git 行统计对齐，供改动条展示。
 * 运行中没有 Git 命中时仍列出文件，增减为 0；停跑后只留仍在 workspace.changes 里的。
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
    const parts = sessionFileParts(resolved)
    const additions = change?.additions ?? 0
    const deletions = change?.deletions ?? 0
    files.push({
      path: resolved,
      name: parts.name,
      dir: parts.dir,
      additions,
      deletions,
      kind: sessionEntryKind(resolved, parts.name, additions, deletions)
    })
  }
  return files
}

/** 已提交进 HEAD 的 path 不再进改动条。 */
export function collectDirtySessionFiles(
  paths: string[],
  changes: ChangedFileRow[]
): SessionReviewFile[] {
  return collectSessionFiles(paths, changes).filter((file) => Boolean(matchChange(file.path, changes)))
}

export type ReviewFilePick = {
  files: SessionReviewFile[]
  /** 来自本轮写盘时才默认展开；工作区脏文件只出一行 pill。 */
  fromLastTurn: boolean
}

/**
 * 运行中先列本轮写盘；停跑后只留仍 dirty 的。本轮都已提交则回落其余未提交。
 */
export function describeReviewFiles(
  lastTurnPaths: string[],
  changes: ChangedFileRow[],
  running: boolean
): ReviewFilePick {
  if (lastTurnPaths.length > 0) {
    if (running) {
      return { files: collectSessionFiles(lastTurnPaths, changes), fromLastTurn: true }
    }
    const dirty = collectDirtySessionFiles(lastTurnPaths, changes)
    if (dirty.length > 0) return { files: dirty, fromLastTurn: true }
  }
  return {
    files: collectSessionFiles(
      changes.map((row) => row.path),
      changes
    ),
    fromLastTurn: false
  }
}

export function pickReviewFiles(
  lastTurnPaths: string[],
  changes: ChangedFileRow[],
  running: boolean
): SessionReviewFile[] {
  return describeReviewFiles(lastTurnPaths, changes, running).files
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim()
}

function sessionFileParts(path: string): { name: string; dir: string } {
  const parts = path.split("/").filter(Boolean)
  const name = parts.pop() ?? path
  return { name, dir: parts.join("/") }
}

const FILE_BASENAMES = new Set([
  "dockerfile",
  "makefile",
  "license",
  "licence",
  "gemfile",
  "procfile",
  "rakefile",
  "readme",
  "changelog",
  "authors",
  "copying",
  "notice"
])

/** Git 未跟踪目录常无行统计、路径带尾斜杠；无扩展名的 0/0 也当目录。 */
export function sessionEntryKind(
  path: string,
  name: string,
  additions: number,
  deletions: number
): "file" | "directory" {
  if (path.endsWith("/") || path.endsWith("\\")) return "directory"
  if (name.includes(".")) return "file"
  if (FILE_BASENAMES.has(name.toLowerCase())) return "file"
  if (additions <= 0 && deletions <= 0) return "directory"
  return "file"
}

function matchChange(path: string, changes: ChangedFileRow[]): ChangedFileRow | undefined {
  const exact = changes.find((row) => normalizePath(row.path) === path)
  if (exact) return exact
  return changes.find((row) => {
    const other = normalizePath(row.path)
    return other.endsWith(`/${path}`) || path.endsWith(`/${other}`)
  })
}
