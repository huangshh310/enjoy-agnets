/**
 * Knowledge 检索：向量优先，空结果回落词袋；可选 rerank。
 */
import { listChunkEmbeddings, listSources } from "@enjoy-agents/db"
import { fallbackLocalRerank, lexicalScore, rerankWithProvider } from "@enjoy-agents/knowledge"
import { getDatabase } from "./database"
import { queryVector, resolveRerankModel, scoreEmbedded } from "./knowledge-embed"

type SearchHit = {
  chunkId: string
  sourceId: string
  path: string
  startLine?: number
  endLine?: number
  snippet: string
  score: number
}

export async function searchKnowledge(
  workspaceId: string,
  query: string,
  limit: number,
  rerank = false
) {
  const embedded = listChunkEmbeddings(getDatabase(), workspaceId)
  let hits =
    embedded.length > 0 ? await vectorHits(embedded, query, limit) : lexicalSearch(workspaceId, query, limit)
  if (hits.length === 0) hits = lexicalSearch(workspaceId, query, limit)
  if (!rerank) return hits.slice(0, limit)
  const withLexical = hits.map((hit) => ({ ...hit, lexical: lexicalScore(query, hit.snippet) }))
  const providerHits = await rerankWithProvider(await resolveRerankModel(), query, withLexical)
  return (providerHits ?? fallbackLocalRerank(query, withLexical)).slice(0, limit)
}

async function vectorHits(
  embedded: ReturnType<typeof listChunkEmbeddings>,
  query: string,
  limit: number
): Promise<SearchHit[]> {
  const queryVec = await queryVector(query, embedded[0]?.modelId ?? "hashed")
  if (!queryVec) return []
  return embedded
    .map((item) => ({
      chunkId: item.chunkId,
      sourceId: "",
      path: item.path,
      startLine: item.startLine ?? undefined,
      endLine: item.endLine ?? undefined,
      snippet: item.text.slice(0, 400),
      score: scoreEmbedded(queryVec, item)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function lexicalSearch(workspaceId: string, query: string, limit: number): SearchHit[] {
  const hits: SearchHit[] = []
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
