import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"

export function mergeRecentHits(next: KnowledgeHit[], prev: KnowledgeHit[], limit = 5): KnowledgeHit[] {
  const merged = [...next, ...prev]
  const seen = new Set<string>()
  return merged.filter((hit) => {
    if (seen.has(hit.chunkId)) return false
    seen.add(hit.chunkId)
    return true
  }).slice(0, limit)
}
