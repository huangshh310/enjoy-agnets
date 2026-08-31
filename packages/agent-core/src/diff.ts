/**
 * 行级 File Diff：从两段文本生成 hunk，或解析 git unified diff。
 * 主进程、工具结果与渲染进程共用同一模型。
 */

export type DiffLineKind = "context" | "add" | "del"

export type DiffLine = {
  kind: DiffLineKind
  text: string
  oldNo?: number
  newNo?: number
}

export type DiffHunk = {
  header: string
  oldStart: number
  newStart: number
  lines: DiffLine[]
}

export type FileDiffModel = {
  path: string
  hunks: DiffHunk[]
  additions: number
  deletions: number
}

const CONTEXT = 3
const MAX_LINES = 2_000

export function diffTexts(oldText: string, newText: string, path: string): FileDiffModel {
  const oldLines = capLines(splitLines(oldText))
  const newLines = capLines(splitLines(newText))
  const lines = flattenOps(alignLines(oldLines, newLines), oldLines, newLines)
  return summarize(path, groupHunks(lines))
}

export function parseUnifiedDiff(raw: string, fallbackPath = "file"): FileDiffModel {
  const path = extractDiffPath(raw) || fallbackPath
  const hunks: DiffHunk[] = []
  let current: DiffHunk | null = null
  let oldNo = 0
  let newNo = 0

  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (match) {
      oldNo = Number(match[1])
      newNo = Number(match[2])
      current = { header: line, oldStart: oldNo, newStart: newNo, lines: [] }
      hunks.push(current)
      continue
    }
    if (!current || isDiffMeta(line)) continue
    current.lines.push(readUnifiedLine(line, oldNo, newNo))
    const step = unifiedStep(line)
    oldNo += step.old
    newNo += step.next
  }

  return summarize(path, hunks)
}

export function toUnifiedDiff(model: FileDiffModel): string {
  const body = model.hunks
    .map((hunk) => [hunk.header, ...hunk.lines.map(formatUnifiedLine)].join("\n"))
    .join("\n")
  return [`--- a/${model.path}`, `+++ b/${model.path}`, body].join("\n")
}

export function emptyDiff(path: string): FileDiffModel {
  return { path, hunks: [], additions: 0, deletions: 0 }
}

function splitLines(text: string): string[] {
  if (!text) return []
  return text.replace(/\r\n/g, "\n").split("\n")
}

function capLines(lines: string[]): string[] {
  return lines.length > MAX_LINES ? lines.slice(0, MAX_LINES) : lines
}

function alignLines(oldLines: string[], newLines: string[]): Array<"eq" | "del" | "add"> {
  const rows = oldLines.length
  const cols = newLines.length
  const table = Array.from({ length: rows + 1 }, () => new Uint16Array(cols + 1))
  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      setLcs(
        table,
        i,
        j,
        oldLines[i - 1] === newLines[j - 1]
          ? lcsAt(table, i - 1, j - 1) + 1
          : Math.max(lcsAt(table, i - 1, j), lcsAt(table, i, j - 1))
      )
    }
  }
  return backtrack(table, oldLines, newLines)
}

function backtrack(
  table: Uint16Array[],
  oldLines: string[],
  newLines: string[]
): Array<"eq" | "del" | "add"> {
  const ops: Array<"eq" | "del" | "add"> = []
  let i = oldLines.length
  let j = newLines.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push("eq")
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || lcsAt(table, i, j - 1) >= lcsAt(table, i - 1, j))) {
      ops.push("add")
      j -= 1
    } else {
      ops.push("del")
      i -= 1
    }
  }
  return ops.reverse()
}

function lcsAt(table: Uint16Array[], i: number, j: number): number {
  return table[i]?.[j] ?? 0
}

function setLcs(table: Uint16Array[], i: number, j: number, value: number) {
  const row = table[i]
  if (row) row[j] = value
}

function flattenOps(
  ops: Array<"eq" | "del" | "add">,
  oldLines: string[],
  newLines: string[]
): DiffLine[] {
  const lines: DiffLine[] = []
  let oldIdx = 0
  let newIdx = 0
  let oldNo = 1
  let newNo = 1
  for (const op of ops) {
    if (op === "eq") {
      lines.push({ kind: "context", text: oldLines[oldIdx] ?? "", oldNo, newNo })
      oldIdx += 1
      newIdx += 1
      oldNo += 1
      newNo += 1
    } else if (op === "del") {
      lines.push({ kind: "del", text: oldLines[oldIdx] ?? "", oldNo })
      oldIdx += 1
      oldNo += 1
    } else {
      lines.push({ kind: "add", text: newLines[newIdx] ?? "", newNo })
      newIdx += 1
      newNo += 1
    }
  }
  return lines
}

function groupHunks(lines: DiffLine[]): DiffHunk[] {
  const changed = lines.map((line) => line.kind !== "context")
  const hunks: DiffHunk[] = []
  let index = 0
  while (index < lines.length) {
    if (!changed[index]) {
      index += 1
      continue
    }
    const start = Math.max(0, index - CONTEXT)
    const end = hunkEnd(changed, index)
    hunks.push(toHunk(lines.slice(start, end)))
    index = end
  }
  return hunks
}

function hunkEnd(changed: boolean[], from: number): number {
  let end = from
  while (end < changed.length) {
    if (changed[end]) {
      end += 1
      continue
    }
    let look = end
    let gap = 0
    while (look < changed.length && !changed[look] && gap < CONTEXT * 2) {
      look += 1
      gap += 1
    }
    if (look < changed.length && changed[look] && gap <= CONTEXT * 2) {
      end = look
      continue
    }
    return Math.min(changed.length, end + CONTEXT)
  }
  return end
}

function toHunk(lines: DiffLine[]): DiffHunk {
  const oldStart = lines.find((line) => line.oldNo)?.oldNo ?? 1
  const newStart = lines.find((line) => line.newNo)?.newNo ?? 1
  const oldCount = lines.filter((line) => line.kind !== "add").length
  const newCount = lines.filter((line) => line.kind !== "del").length
  return {
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    oldStart,
    newStart,
    lines
  }
}

function isDiffMeta(line: string): boolean {
  return line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")
}

function readUnifiedLine(line: string, oldNo: number, newNo: number): DiffLine {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return { kind: "add", text: line.slice(1), newNo }
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return { kind: "del", text: line.slice(1), oldNo }
  }
  return {
    kind: "context",
    text: line.startsWith(" ") ? line.slice(1) : line,
    oldNo,
    newNo
  }
}

function unifiedStep(line: string): { old: number; next: number } {
  if (line.startsWith("+") && !line.startsWith("+++")) return { old: 0, next: 1 }
  if (line.startsWith("-") && !line.startsWith("---")) return { old: 1, next: 0 }
  if (line.startsWith("\\")) return { old: 0, next: 0 }
  return { old: 1, next: 1 }
}

function formatUnifiedLine(line: DiffLine): string {
  if (line.kind === "add") return `+${line.text}`
  if (line.kind === "del") return `-${line.text}`
  return ` ${line.text}`
}

function extractDiffPath(raw: string): string | undefined {
  const plus = raw.match(/^\+\+\+ [ab]\/(.+)$/m)
  if (plus?.[1]) return plus[1].trim()
  const git = raw.match(/^diff --git a\/(.+) b\/(.+)$/m)
  return git?.[2]
}

function summarize(path: string, hunks: DiffHunk[]): FileDiffModel {
  return {
    path,
    hunks,
    additions: hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.kind === "add").length, 0),
    deletions: hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.kind === "del").length, 0)
  }
}
