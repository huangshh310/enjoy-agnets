/**
 * 可选 Provider rerank：调用 SDK `rerank`。失败回落本地融合，不假装已重排。
 */
import { lexicalScore } from "./cosine.ts"
import { rerankHits } from "./rerank.ts"

export type RankableHit = {
  snippet: string
  score: number
  lexical?: number
}

export async function rerankWithProvider<T extends RankableHit>(
  model: unknown,
  query: string,
  hits: T[]
): Promise<T[] | null> {
  if (!model || hits.length === 0) return null
  try {
    const { rerank } = await import("ai")
    const result = await rerank({
      model: model as never,
      query,
      documents: hits.map((hit) => hit.snippet),
      topN: hits.length
    })
    const ranking = (result as { ranking?: Array<{ index?: number; relevanceScore?: number }> }).ranking
    if (!ranking?.length) return null
    return ranking
      .map((item) => {
        const hit = hits[item.index ?? -1]
        if (!hit) return null
        return { ...hit, score: item.relevanceScore ?? hit.score }
      })
      .filter((item): item is T => item != null)
  } catch {
    return null
  }
}

export function fallbackLocalRerank<T extends RankableHit>(query: string, hits: T[]): T[] {
  return rerankHits(
    hits.map((hit) => ({
      ...hit,
      lexical: hit.lexical ?? lexicalScore(query, hit.snippet)
    }))
  )
}
