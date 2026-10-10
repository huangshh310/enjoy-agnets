/**
 * 把上一轮写盘 path 与 Git 行统计对齐，供改动条 / 打回通过横幅展示。
 * 只列本轮已执行（或可能已改盘）的写盘 path。禁止把整仓未提交回落进来。
 * 运行中没有 Git 命中时仍列出本轮文件，增减为 0；git 仓停跑后只留本轮仍 dirty 的。
 * 非 git 仓停跑后直接列本轮 path。
 */
import type { ChangedFileRow } from "@renderer/stores/chat-store.types"
import { isPlaceholderChangedDir } from "../../right-pane/views/review/last-turn-paths"
import type { SessionReviewFile } from "./session-review.types"

export function collectSessionFiles(
  paths: string[],
  changes: ChangedFileRow[]
): SessionReviewFile[] {
  const seen: Record<string, true> = {}
  const files: SessionReviewFile[] = []
  for (const raw of paths) {
    const path = normalizePath(raw)
    if (!path || isPlaceholderChangedDir(path) || seen[path]) continue
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
  /** git 仓求交为空、回落本轮 path：文件可能已提交/还原，文案加「本轮写过」。 */
  wroteThisTurnOnly?: boolean
}

/**
 * 有写盘 path 就用 run.tools 的 path。可与 git 表对齐增减，但求交为空时
 * 必须回落 path（父仓 + 未跟踪目录常见），禁止掉进占位句。
 * 没有本轮写盘：空列表。审查栏才看整仓 git。
 */
export function describeReviewFiles(
  lastTurnPaths: string[],
  changes: ChangedFileRow[],
  running: boolean,
  gitRepo?: boolean | null
): ReviewFilePick {
  if (lastTurnPaths.length === 0) return { files: [], fromLastTurn: false }
  if (running || gitRepo === false) {
    return { files: collectSessionFiles(lastTurnPaths, changes), fromLastTurn: true }
  }
  const dirty = collectDirtySessionFiles(lastTurnPaths, changes)
  if (dirty.length > 0) return { files: dirty, fromLastTurn: true }
  return {
    files: collectSessionFiles(lastTurnPaths, changes),
    fromLastTurn: true,
    wroteThisTurnOnly: true
  }
}

export function pickReviewFiles(
  lastTurnPaths: string[],
  changes: ChangedFileRow[],
  running: boolean,
  gitRepo?: boolean | null
): SessionReviewFile[] {
  return describeReviewFiles(lastTurnPaths, changes, running, gitRepo).files
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
