/**
 * 把聊天引用的路由 search 灌进知识页：设 query、跑检索、标出命中块。
 */
import { useEffect, useRef } from "react"
import { useSearch } from "@tanstack/react-router"
import type { KnowledgeDocumentItem, KnowledgeHit } from "@enjoy-agents/ipc-contract"
import {
  citeSearchKey,
  knowledgeCiteQuery,
  matchCitedHit,
  parseKnowledgeSearch
} from "../lib/knowledge-route-search"

export function useKnowledgeCiteFromRoute(input: {
  workspaceId: string | null
  documents: KnowledgeDocumentItem[]
  documentsReady: boolean
  hits: KnowledgeHit[]
  enabledSourceIds: readonly string[]
  setSelectedFolder: (path: string | null) => void
  setQuery: (q: string) => void
  setCitedPaths: (fn: (prev: string[]) => string[]) => void
  runSearch: (query: string, folder: string | null, sourceIds: readonly string[]) => Promise<void>
}) {
  const raw = useSearch({ strict: false }) as Record<string, unknown>
  const cite = parseKnowledgeSearch(raw)
  const key = citeSearchKey(cite)
  const applied = useRef("")
  const runSearchRef = useRef(input.runSearch)
  runSearchRef.current = input.runSearch

  useEffect(() => {
    if (!key || !input.workspaceId) return
    if (cite.path && !input.documentsReady) return
    const q = knowledgeCiteQuery(cite)
    if (!q) return
    if (applied.current === key) return
    applied.current = key
    const doc = cite.path
      ? input.documents.find((item) => item.path === cite.path)
      : undefined
    const folder = doc?.sourcePath ?? null
    if (folder) input.setSelectedFolder(folder)
    input.setQuery(q)
    if (cite.path) {
      const citedPath = cite.path
      input.setCitedPaths((prev) => (prev.includes(citedPath) ? prev : [...prev, citedPath]))
    }
    void runSearchRef.current(q, folder, input.enabledSourceIds)
  }, [
    key,
    cite.path,
    input.workspaceId,
    input.documents,
    input.documentsReady,
    input.enabledSourceIds,
    input.setSelectedFolder,
    input.setQuery,
    input.setCitedPaths
  ])

  return { focusChunkId: matchCitedHit(input.hits, cite)?.chunkId ?? null }
}
