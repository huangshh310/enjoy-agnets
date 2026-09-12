/**
 * Knowledge 检索：向量优先，空结果回落词袋；可选 rerank 与来源过滤。
 */
import { listChunkEmbeddings, listSources } from "@enjoy-agents/db"
import { fallbackLocalRerank, lexicalScore, rerankWithProvider } from "@enjoy-agents/knowledge"
import type { KnowledgeEmbeddingKind, KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { queryVector, resolveRerankModel, scoreEmbedded } from "./knowledge-embed"

export type SearchKnowledgeResult = {
  hits: KnowledgeHit[]
  embeddingKind: KnowledgeEmbeddingKind
}

export async function searchKnowledge(
  workspaceId: string,
  query: string,
  limit: number,
  rerank = false,
  sourceIds?: string[]
): Promise<SearchKnowledgeResult> {
  // 有来源过滤时先裁候选集：既省掉无关 chunk 的余弦计算，也避免全局 top-limit 过滤后命中率塌掉。
  const embedded = listChunkEmbeddings(getDatabase(), workspaceId, sourceIds)
  const modelId = embedded[0]?.modelId
  let embeddingKind: KnowledgeEmbeddingKind =
    !modelId || modelId === "hashed" ? "hashed" : "provider"
  let hits =
    embedded.length > 0 ? await vectorHits(embedded, query, limit) : lexicalSearch(workspaceId, query, limit)
  if (embedded.length === 0) {
    hits = lexicalSearch(workspaceId, query, limit)
    embeddingKind = "lexical"
  } else if (hits.length === 0) {
    hits = lexicalSearch(workspaceId, query, limit)
    embeddingKind = "lexical"
  }
  if (!rerank) return stampKind({ hits: hits.slice(0, limit), embeddingKind })
  const withLexical = hits.map((hit) => ({ ...hit, lexical: lexicalScore(query, hit.snippet) }))
  const providerHits = await rerankWithProvider(await resolveRerankModel(), query, withLexical)
  const ranked = (providerHits ?? fallbackLocalRerank(query, withLexical)).slice(0, limit)
  return stampKind({ hits: ranked, embeddingKind })
}

function stampKind(result: SearchKnowledgeResult): SearchKnowledgeResult {
  return {
    embeddingKind: result.embeddingKind,
    hits: result.hits.map((hit) => ({ ...hit, embeddingKind: result.embeddingKind }))
  }
}

async function vectorHits(
  embedded: ReturnType<typeof listChunkEmbeddings>,
  query: string,
  limit: number
): Promise<KnowledgeHit[]> {
  const queryVec = await queryVector(query, embedded[0]?.modelId ?? "hashed")
  if (!queryVec) return []
  return embedded
    .map((item) => ({
      chunkId: item.chunkId,
      sourceId: item.sourceId,
      path: item.path,
      startLine: item.startLine ?? undefined,
      endLine: item.endLine ?? undefined,
      snippet: item.text.slice(0, 400),
      score: scoreEmbedded(queryVec, item)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function lexicalSearch(workspaceId: string, query: string, limit: number): KnowledgeHit[] {
  const hits: KnowledgeHit[] = []
  for (const source of listSources(getDatabase(), workspaceId)) {
    const rows = getDatabase()
      .prepare(
        `SELECT id, source_id as sourceId, path, start_line as startLine, end_line as endLine, text
         FROM knowledge_chunks WHERE source_id = ?`
      )
      .all(source.id) as Array<{
      id: string
      sourceId: string
      path: string
      startLine: number | null
      endLine: number | null
      text: string
    }>
    for (const row of rows) {
      const score = lexicalScore(query, row.text)
      if (score <= 0) continue
      hits.push({
        chunkId: row.id,
        sourceId: row.sourceId,
        path: row.path,
        startLine: row.startLine ?? undefined,
        endLine: row.endLine ?? undefined,
        snippet: row.text.slice(0, 400),
        score
      })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
