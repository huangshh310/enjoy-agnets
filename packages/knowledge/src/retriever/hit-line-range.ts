/**
 * 知识库命中行：chunk 的 startLine 是块首，要映到真正匹配 query 的行。
 */
import { lexicalScore } from "./cosine.ts"

export type HitLineRange = { start: number; end: number }

export function mapHitLineRange(input: {
  startLine?: number
  snippet?: string
  query?: string
}): HitLineRange | null {
  if (input.startLine == null || !Number.isFinite(input.startLine)) return null
  const origin = input.startLine
  const snippet = input.snippet ?? ""
  const query = input.query?.trim() ?? ""
  if (!query || snippet === "") return { start: origin, end: origin }

  const lines = snippet.split(/\r?\n/)
  const run = bestMatchingRun(lines, query)
  if (!run) return { start: origin, end: origin }
  return { start: origin + run.first, end: origin + run.last }
}

/** 把 snippet 收成命中行，startLine / endLine 与片段对齐，再 pin 一次也还是同一行。 */
export function pinHitToQuery<T extends { startLine?: number; endLine?: number; snippet: string }>(
  hit: T,
  query: string
): T {
  const range = mapHitLineRange({
    startLine: hit.startLine,
    snippet: hit.snippet,
    query
  })
  if (!range || hit.startLine == null) return hit
  const lines = hit.snippet.split(/\r?\n/)
  const from = range.start - hit.startLine
  const to = range.end - hit.startLine
  const pinned = lines.slice(from, to + 1).join("\n").trimEnd()
  return {
    ...hit,
    startLine: range.start,
    endLine: range.end,
    snippet: pinned || hit.snippet
  }
}

function bestMatchingRun(lines: string[], query: string): { first: number; last: number } | null {
  const scores = lines.map((line) => lexicalScore(query, line))
  const best = Math.max(0, ...scores)
  if (best <= 0) return null
  let first = -1
  let last = -1
  for (let i = 0; i < scores.length; i += 1) {
    const empty = (lines[i] ?? "").trim() === ""
    if (scores[i] !== best || empty) {
      if (first >= 0) break
      continue
    }
    if (first < 0) first = i
    last = i
  }
  return first < 0 ? null : { first, last }
}
