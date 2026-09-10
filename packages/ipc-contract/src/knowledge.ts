/**
 * Knowledge / RAG IPC：来源、索引、检索、取消。
 * 只索引用户显式选择的路径；忽略规则在 main 执行。
 */
import { z } from "zod"

export const KnowledgeSource = z.object({
  id: z.string(),
  workspaceId: z.string(),
  path: z.string(),
  kind: z.enum(["file", "directory"]),
  status: z.enum(["idle", "indexing", "ready", "error", "paused"]),
  documentCount: z.number().int().nonnegative().default(0),
  chunkCount: z.number().int().nonnegative().default(0),
  error: z.string().optional(),
  updatedAt: z.number().int(),
  embeddingModelId: z.string().optional(),
  embeddingsStale: z.boolean().optional()
})
export type KnowledgeSource = z.infer<typeof KnowledgeSource>

export const KnowledgeEmbeddingKind = z.enum(["provider", "hashed", "lexical"])
export type KnowledgeEmbeddingKind = z.infer<typeof KnowledgeEmbeddingKind>

export const KnowledgeHit = z.object({
  chunkId: z.string(),
  sourceId: z.string(),
  path: z.string(),
  startLine: z.number().int().optional(),
  endLine: z.number().int().optional(),
  snippet: z.string(),
  score: z.number(),
  embeddingKind: KnowledgeEmbeddingKind.optional()
})
export type KnowledgeHit = z.infer<typeof KnowledgeHit>

export const KnowledgeSearchResult = z.object({
  hits: z.array(KnowledgeHit),
  embeddingKind: KnowledgeEmbeddingKind
})
export type KnowledgeSearchResult = z.infer<typeof KnowledgeSearchResult>

export const KnowledgeSourcesInput = z
  .object({
    workspaceId: z.string().min(1)
  })
  .strict()
export type KnowledgeSourcesInput = z.infer<typeof KnowledgeSourcesInput>

export const KnowledgeAddSourceInput = z
  .object({
    workspaceId: z.string().min(1),
    path: z.string().min(1)
  })
  .strict()
export type KnowledgeAddSourceInput = z.infer<typeof KnowledgeAddSourceInput>

export const KnowledgeIndexInput = z
  .object({
    sourceId: z.string().min(1),
    rebuild: z.boolean().default(false)
  })
  .strict()
export type KnowledgeIndexInput = z.infer<typeof KnowledgeIndexInput>

export const KnowledgeSearchInput = z
  .object({
    workspaceId: z.string().min(1),
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(8),
    rerank: z.boolean().default(false),
    sourceIds: z.array(z.string().min(1)).max(64).optional()
  })
  .strict()
export type KnowledgeSearchInput = z.infer<typeof KnowledgeSearchInput>

export const KnowledgeCancelInput = z.object({ sourceId: z.string().min(1) }).strict()
export type KnowledgeCancelInput = z.infer<typeof KnowledgeCancelInput>

export const KnowledgeRemoveInput = z.object({ sourceId: z.string().min(1) }).strict()
export type KnowledgeRemoveInput = z.infer<typeof KnowledgeRemoveInput>

export const KnowledgeDocumentItem = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourcePath: z.string(),
  path: z.string(),
  chunkCount: z.number().int().nonnegative().default(0),
  status: z.string(),
  updatedAt: z.number().int()
})
export type KnowledgeDocumentItem = z.infer<typeof KnowledgeDocumentItem>

export const KnowledgeDocumentsInput = z
  .object({
    workspaceId: z.string().min(1),
    sourceId: z.string().optional()
  })
  .strict()
export type KnowledgeDocumentsInput = z.infer<typeof KnowledgeDocumentsInput>
