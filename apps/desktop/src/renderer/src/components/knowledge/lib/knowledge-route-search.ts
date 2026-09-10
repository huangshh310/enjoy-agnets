/**
 * 知识页 Hash 路由 search：聊天引用带 path / snippet 回来定位。
 */
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"

export type KnowledgeRouteSearch = {
  q?: string
  path?: string
  snippet?: string
  startLine?: number
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function asOptionalLine(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/** Hash 查询里的 startLine 可能是字符串，统一收成可选字段。 */
export function parseKnowledgeSearch(search: Record<string, unknown>): KnowledgeRouteSearch {
  return {
    q: asOptionalString(search.q),
    path: asOptionalString(search.path),
    snippet: asOptionalString(search.snippet),
    startLine: asOptionalLine(search.startLine)
  }
}

export function knowledgeSearchFromSource(source: {
  path: string
  title?: string
  snippet?: string
  startLine?: number
}): KnowledgeRouteSearch {
  const seed = source.snippet?.trim() || source.title?.trim() || source.path
  return {
    path: source.path,
    q: seed.slice(0, 160),
    snippet: source.snippet,
    startLine: source.startLine
  }
}

export function knowledgeCiteQuery(cite: KnowledgeRouteSearch): string | undefined {
  const snippet = cite.snippet?.trim()
  if (snippet) return snippet.slice(0, 160)
  if (cite.q?.trim()) return cite.q.trim()
  if (!cite.path) return undefined
  const parts = cite.path.replaceAll("\\", "/").split("/")
  return parts.at(-1) || cite.path
}

export function citeSearchKey(cite: KnowledgeRouteSearch): string {
  if (!cite.path && !cite.q && !cite.snippet) return ""
  return [cite.path ?? "", cite.q ?? "", cite.snippet ?? "", cite.startLine ?? ""].join("\0")
}

/** 优先 path+行号，其次 snippet 包含，最后同路径第一条。 */
export function matchCitedHit(
  hits: readonly KnowledgeHit[],
  cite: KnowledgeRouteSearch
): KnowledgeHit | null {
  if (!hits.length) return null
  const byPath = cite.path ? hits.filter((hit) => hit.path === cite.path) : [...hits]
  const pool = byPath.length ? byPath : [...hits]
  if (cite.startLine != null) {
    const line = pool.find((hit) => hit.startLine === cite.startLine)
    if (line) return line
  }
  const snip = cite.snippet?.trim()
  if (snip) {
    const hit = pool.find(
      (item) => item.snippet.includes(snip) || snip.includes(item.snippet.trim())
    )
    if (hit) return hit
  }
  return pool[0] ?? null
}
