/**
 * 索引增量：按文档 hash 跳过未变文件；rebuild 清内容。
 */
import {
  deleteSourceContent,
  listDocuments,
  upsertDocument,
  type KnowledgeSourceRow
} from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { skipIfUnchanged } from "./knowledge-skip"

export { hashText, skipIfUnchanged } from "./knowledge-skip"

export function documentIdFor(sourceId: string, rel: string): string {
  return `doc_${sourceId}_${rel}`.slice(0, 240)
}

export function shouldSkipIndexedFile(sourceId: string, rel: string, hash: string): boolean {
  const existing = listDocuments(getDatabase(), sourceId).find((doc) => doc.path === rel)
  return skipIfUnchanged(existing, hash)
}

export function markDocumentReady(sourceId: string, rel: string, hash: string): void {
  upsertDocument(getDatabase(), {
    id: documentIdFor(sourceId, rel),
    sourceId,
    path: rel,
    hash,
    status: "ready"
  })
}

export function clearSourceContent(source: KnowledgeSourceRow): void {
  deleteSourceContent(getDatabase(), source.id)
}
