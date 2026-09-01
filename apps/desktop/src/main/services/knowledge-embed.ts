/**
 * 索引后写向量：先 hashedEmbedding，有 Key 再尝试 embedMany 覆盖。
 */
import { embedQuery, embedTexts, withTimeout } from "@enjoy-agents/agent-core"
import { insertEmbedding, listSourceChunkEmbeddings } from "@enjoy-agents/db"
import { cosineSimilarity, hashedEmbedding } from "@enjoy-agents/knowledge"
import {
  createEmbeddingModel,
  createRerankModel,
  defaultEmbeddingModelId,
  defaultRerankModelId
} from "@enjoy-agents/providers"
import { getDatabase } from "./database"
import { getActiveProfile, readSecret } from "./secrets"
import { isE2eStub } from "./e2e-stub"

export function storeHashedEmbeddings(
  chunks: Array<{ id: string; text: string }>
): void {
  const db = getDatabase()
  for (const chunk of chunks) {
    insertEmbedding(db, chunk.id, "hashed", hashedEmbedding(chunk.text))
  }
}

export async function tryProviderEmbeddings(
  chunks: Array<{ id: string; text: string }>
): Promise<string> {
  if (isE2eStub()) return "hashed"
  const model = await embeddingModel()
  if (!model) return "hashed"
  const vectors = await withTimeout(
    () => embedTexts(model.model, chunks.map((chunk) => chunk.text)),
    8_000
  ).catch(() => null)
  if (!vectors || vectors.length !== chunks.length) return "hashed"
  const db = getDatabase()
  chunks.forEach((chunk, index) => {
    const vector = vectors[index]
    if (vector) insertEmbedding(db, chunk.id, model.modelId, vector)
  })
  return model.modelId
}

export async function queryVector(text: string, modelId: string): Promise<number[] | null> {
  if (modelId === "hashed") return hashedEmbedding(text)
  const model = await embeddingModel()
  if (!model) return hashedEmbedding(text)
  // 索引 embed 已有 8s 上限；查询同样封顶，避免 citeKnowledge 卡死 Agent 开泵
  const vector = await withTimeout(() => embedQuery(model.model, text), 8_000).catch(() => null)
  return vector ?? null
}

export async function resolveRerankModel(): Promise<unknown | undefined> {
  const secret = await readSecret()
  const active = await getActiveProfile()
  if (!secret && !active) return undefined
  const kind = active?.kind ?? secret?.provider ?? "custom"
  return createRerankModel({
    provider: kind,
    apiKey: secret?.apiKey ?? active?.apiKey ?? "",
    modelId: defaultRerankModelId(kind, active?.modelId),
    baseURL: active?.baseURL ?? secret?.baseURL
  })
}

export async function resolveEmbeddingModelId(): Promise<string> {
  const model = await embeddingModel()
  return model?.modelId ?? "hashed"
}

export async function reembedStaleSource(sourceId: string): Promise<void> {
  const current = await resolveEmbeddingModelId()
  const stale = listSourceChunkEmbeddings(getDatabase(), sourceId).filter(
    (row) => row.modelId !== current
  )
  if (stale.length === 0) return
  const chunks = stale.map((row) => ({ id: row.chunkId, text: row.text }))
  if (current === "hashed") {
    storeHashedEmbeddings(chunks)
    return
  }
  const used = await tryProviderEmbeddings(chunks)
  if (used === "hashed") storeHashedEmbeddings(chunks)
}

export function scoreEmbedded(
  query: number[],
  item: { text: string; vector: number[] }
): number {
  if (query.length === item.vector.length) return cosineSimilarity(query, item.vector)
  return 0
}

async function embeddingModel() {
  const secret = await readSecret()
  const active = await getActiveProfile()
  if (!secret && !active) return null
  const kind = active?.kind ?? secret?.provider ?? "custom"
  const modelId = defaultEmbeddingModelId(kind, active?.modelId)
  return {
    modelId,
    model: createEmbeddingModel({
      provider: kind,
      apiKey: secret?.apiKey ?? "",
      modelId,
      baseURL: active?.baseURL ?? secret?.baseURL
    })
  }
}
