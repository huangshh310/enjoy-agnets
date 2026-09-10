/**
 * 知识库来源 / 文档 / chunk / embedding 仓储。
 */
import type { AppDatabase } from "../client"

export type KnowledgeSourceRow = {
  id: string
  workspaceId: string
  path: string
  kind: string
  status: string
  documentCount: number
  chunkCount: number
  error: string | null
  updatedAt: number
}

export function upsertSource(db: AppDatabase, row: KnowledgeSourceRow): void {
  db.prepare(
    `INSERT INTO knowledge_sources
      (id, workspace_id, path, kind, status, document_count, chunk_count, error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       document_count = excluded.document_count,
       chunk_count = excluded.chunk_count,
       error = excluded.error,
       updated_at = excluded.updated_at`
  ).run(
    row.id,
    row.workspaceId,
    row.path,
    row.kind,
    row.status,
    row.documentCount,
    row.chunkCount,
    row.error,
    row.updatedAt
  )
}

export function listSources(db: AppDatabase, workspaceId: string): KnowledgeSourceRow[] {
  return db
    .prepare(
      `SELECT id, workspace_id as workspaceId, path, kind, status,
              document_count as documentCount, chunk_count as chunkCount, error,
              updated_at as updatedAt
       FROM knowledge_sources WHERE workspace_id = ? ORDER BY updated_at DESC`
    )
    .all(workspaceId) as KnowledgeSourceRow[]
}

export function getSource(db: AppDatabase, id: string): KnowledgeSourceRow | undefined {
  return db
    .prepare(
      `SELECT id, workspace_id as workspaceId, path, kind, status,
              document_count as documentCount, chunk_count as chunkCount, error,
              updated_at as updatedAt
       FROM knowledge_sources WHERE id = ?`
    )
    .get(id) as KnowledgeSourceRow | undefined
}

export function deleteSource(db: AppDatabase, id: string): void {
  const docs = db
    .prepare("SELECT id FROM knowledge_documents WHERE source_id = ?")
    .all(id) as Array<{ id: string }>
  for (const doc of docs) {
    const chunks = db
      .prepare("SELECT id FROM knowledge_chunks WHERE document_id = ?")
      .all(doc.id) as Array<{ id: string }>
    for (const chunk of chunks) {
      db.prepare("DELETE FROM knowledge_embeddings WHERE chunk_id = ?").run(chunk.id)
    }
    db.prepare("DELETE FROM knowledge_chunks WHERE document_id = ?").run(doc.id)
  }
  db.prepare("DELETE FROM knowledge_documents WHERE source_id = ?").run(id)
  db.prepare("DELETE FROM knowledge_sources WHERE id = ?").run(id)
}

export function upsertDocument(
  db: AppDatabase,
  doc: { id: string; sourceId: string; path: string; hash: string; status: string }
): void {
  db.prepare(
    `INSERT INTO knowledge_documents (id, source_id, path, hash, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET hash = excluded.hash, status = excluded.status, updated_at = excluded.updated_at`
  ).run(doc.id, doc.sourceId, doc.path, doc.hash, doc.status, Date.now())
}

export function listDocuments(
  db: AppDatabase,
  sourceId: string
): Array<{ id: string; path: string; hash: string; status: string }> {
  return db
    .prepare(
      `SELECT id, path, hash, status FROM knowledge_documents WHERE source_id = ?`
    )
    .all(sourceId) as Array<{ id: string; path: string; hash: string; status: string }>
}

export function countSourceChunks(db: AppDatabase, sourceId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as n FROM knowledge_chunks WHERE source_id = ?")
    .get(sourceId) as { n: number }
  return row.n
}

export function listChunkPaths(db: AppDatabase, sourceId: string): string[] {
  const rows = db
    .prepare("SELECT DISTINCT path FROM knowledge_chunks WHERE source_id = ?")
    .all(sourceId) as Array<{ path: string }>
  return rows.map((row) => row.path)
}

export function deleteSourceContent(db: AppDatabase, sourceId: string): void {
  const chunks = db
    .prepare("SELECT id FROM knowledge_chunks WHERE source_id = ?")
    .all(sourceId) as Array<{ id: string }>
  for (const chunk of chunks) {
    db.prepare("DELETE FROM knowledge_embeddings WHERE chunk_id = ?").run(chunk.id)
  }
  db.prepare("DELETE FROM knowledge_chunks WHERE source_id = ?").run(sourceId)
  db.prepare("DELETE FROM knowledge_documents WHERE source_id = ?").run(sourceId)
}

export function insertChunk(
  db: AppDatabase,
  chunk: {
    id: string
    documentId: string
    sourceId: string
    path: string
    startLine?: number
    endLine?: number
    text: string
  }
): void {
  db.prepare(
    `INSERT OR REPLACE INTO knowledge_chunks
      (id, document_id, source_id, path, start_line, end_line, text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    chunk.id,
    chunk.documentId,
    chunk.sourceId,
    chunk.path,
    chunk.startLine ?? null,
    chunk.endLine ?? null,
    chunk.text,
    Date.now()
  )
}

export function insertEmbedding(
  db: AppDatabase,
  chunkId: string,
  modelId: string,
  vector: number[]
): void {
  db.prepare(
    `INSERT OR REPLACE INTO knowledge_embeddings (chunk_id, model_id, vector, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(chunkId, modelId, JSON.stringify(vector), Date.now())
}

export function listSourceEmbeddingModels(db: AppDatabase, sourceId: string): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT e.model_id as modelId
       FROM knowledge_embeddings e
       JOIN knowledge_chunks c ON c.id = e.chunk_id
       WHERE c.source_id = ?`
    )
    .all(sourceId) as Array<{ modelId: string }>
  return rows.map((row) => row.modelId)
}

export function listSourceChunkEmbeddings(
  db: AppDatabase,
  sourceId: string
): Array<{ chunkId: string; text: string; modelId: string }> {
  return db
    .prepare(
      `SELECT c.id as chunkId, c.text, COALESCE(e.model_id, '') as modelId
       FROM knowledge_chunks c
       LEFT JOIN knowledge_embeddings e ON e.chunk_id = c.id
       WHERE c.source_id = ?`
    )
    .all(sourceId) as Array<{ chunkId: string; text: string; modelId: string }>
}

export function listChunkEmbeddings(
  db: AppDatabase,
  workspaceId: string
): Array<{
  chunkId: string
  sourceId: string
  path: string
  startLine: number | null
  endLine: number | null
  text: string
  vector: number[]
  modelId: string
}> {
  const rows = db
    .prepare(
      `SELECT c.id as chunkId, c.source_id as sourceId, c.path, c.start_line as startLine, c.end_line as endLine, c.text,
              e.vector, e.model_id as modelId
       FROM knowledge_chunks c
       JOIN knowledge_embeddings e ON e.chunk_id = c.id
       JOIN knowledge_sources s ON s.id = c.source_id
       WHERE s.workspace_id = ?`
    )
    .all(workspaceId) as Array<{
    chunkId: string
    sourceId: string
    path: string
    startLine: number | null
    endLine: number | null
    text: string
    vector: string
    modelId: string
  }>
  return rows.map((row) => ({
    ...row,
    vector: JSON.parse(row.vector) as number[]
  }))
}
