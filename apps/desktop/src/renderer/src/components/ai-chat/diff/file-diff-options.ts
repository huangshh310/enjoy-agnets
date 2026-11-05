/**
 * Diff 显示选项：隐藏纯空白变动、大文件只留第一块 hunk。
 * LARGE_FILE_LINES=400 与 foldLargeFiles 语义是本仓大文件折叠真源（勿用 pierre 上下文折叠冒充）。
 */

import type { DiffHunk, FileDiffModel } from "@enjoy-agents/agent-core/diff"

/** 开折叠且总行数超过此阈值 → 只留第一块 hunk（现网语义）。 */
export const LARGE_FILE_LINES = 400

export function countDiffLines(hunks: DiffHunk[]): number {
  let total = 0
  for (const hunk of hunks) total += hunk.lines.length
  return total
}

/** 当前 model 在 foldLargeFiles 开启时是否会触发「只留首 hunk」。 */
export function wouldFoldLargeFile(
  model: FileDiffModel,
  foldLargeFiles: boolean
): boolean {
  return Boolean(foldLargeFiles) && countDiffLines(model.hunks) > LARGE_FILE_LINES
}

export function applyDiffViewOptions(
  model: FileDiffModel,
  options: { hideWhitespace?: boolean; foldLargeFiles?: boolean }
): FileDiffModel {
  let hunks = model.hunks
  if (options.hideWhitespace) {
    hunks = hunks
      .map((hunk) => ({
        ...hunk,
        lines: hunk.lines.filter((line) => line.kind === "context" || line.text.trim() !== "")
      }))
      .filter((hunk) => hunk.lines.some((line) => line.kind !== "context"))
  }
  if (options.foldLargeFiles && countDiffLines(hunks) > LARGE_FILE_LINES) {
    hunks = hunks.slice(0, 1)
  }
  return { ...model, hunks }
}

/** 相邻删/增行的公共前后缀，用于行内高亮。 */
export function splitWordDiff(before: string, after: string): {
  prefix: string
  removed: string
  added: string
  suffix: string
} {
  let start = 0
  const maxStart = Math.min(before.length, after.length)
  while (start < maxStart && before[start] === after[start]) start += 1
  let end = 0
  const maxEnd = Math.min(before.length - start, after.length - start)
  while (
    end < maxEnd &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1
  }
  return {
    prefix: before.slice(0, start),
    removed: before.slice(start, before.length - end),
    added: after.slice(start, after.length - end),
    suffix: end > 0 ? before.slice(before.length - end) : ""
  }
}
