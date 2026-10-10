/**
 * 引用行范围：跟 snippet / endLine 对齐，丢掉末尾空行。
 */

export type CitedLineRange = { start: number; end: number }

export function citedLineRange(input: {
  startLine?: number
  endLine?: number
  snippet?: string
}): CitedLineRange | null {
  if (input.startLine == null || !Number.isFinite(input.startLine)) return null
  const start = input.startLine
  const snippetLines = countSnippetLines(input.snippet)
  let end = input.endLine ?? (snippetLines > 0 ? start + snippetLines - 1 : start)
  if (end < start) end = start
  return { start, end: trimTrailingEmptyEnd(start, end, input.snippet) }
}

export function formatCitedLines(range: CitedLineRange): string {
  return range.end > range.start ? `L${range.start}–${range.end}` : `L${range.start}`
}

/** 高亮跟引用范围对齐，文件末尾空行不着 accent。 */
export function highlightLineBounds(range: CitedLineRange, fileText: string): CitedLineRange {
  const lines = fileText.split(/\r?\n/)
  let end = range.end
  while (end > range.start && (lines[end - 1] ?? "").trim() === "") end -= 1
  return { start: range.start, end }
}

function countSnippetLines(snippet?: string): number {
  if (snippet == null || snippet === "") return 0
  return snippet.split(/\r?\n/).length
}

function trimTrailingEmptyEnd(start: number, end: number, snippet?: string): number {
  if (snippet == null) return end
  const lines = snippet.split(/\r?\n/)
  let last = lines.length - 1
  while (last > 0 && lines[last].trim() === "") last -= 1
  return Math.min(end, start + last)
}
