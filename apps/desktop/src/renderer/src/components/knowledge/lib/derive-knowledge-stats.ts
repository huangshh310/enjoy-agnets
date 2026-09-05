/**
 * 知识页诚实指标：可问块与异常源分类。
 * errno 只进 detail（tooltip），不上卡面主文案。
 */
import type { KnowledgeStats, KnowledgeUnavailableSource } from "../types/knowledge-ui.types"

export type KnowledgeStatSource = {
  id: string
  path: string
  status: string
  error?: string
  chunkCount?: number
}

export type KnowledgeStatDocument = {
  chunkCount?: number
}

/** 路径缺失类错误（ENOENT 等），仅用于分类，不要把原文画到 UI。 */
export function isMissingPathError(detail?: string): boolean {
  if (!detail) return false
  return /ENOENT|ENOTDIR|not found|no such file|路径不存在|missing/i.test(detail)
}

export function classifySourceFault(
  source: KnowledgeStatSource
): KnowledgeUnavailableSource["reason"] | null {
  const faulty = source.status === "error" || Boolean(source.error)
  if (!faulty) return null
  return isMissingPathError(source.error) ? "missing" : "error"
}

export function knowledgeActionErrorKey(error: unknown): "pathNotFound" | "statusError" {
  const raw = error instanceof Error ? error.message : String(error)
  return isMissingPathError(raw) ? "pathNotFound" : "statusError"
}

export function deriveKnowledgeStats(
  sources: KnowledgeStatSource[],
  documents: KnowledgeStatDocument[]
): KnowledgeStats {
  const unavailable: KnowledgeUnavailableSource[] = []
  let askableChunks = 0
  let readySourceCount = 0

  for (const source of sources) {
    const reason = classifySourceFault(source)
    if (reason) {
      unavailable.push({
        id: source.id,
        path: source.path,
        reason,
        detail: source.error
      })
      continue
    }
    readySourceCount += 1
    askableChunks += source.chunkCount || 0
  }

  const scannedFiles = documents.length
  const askableFiles = documents.filter((doc) => (doc.chunkCount ?? 0) > 0).length

  return {
    askableChunks,
    scannedFiles,
    askableFiles,
    readySourceCount,
    sourceCount: sources.length,
    unavailable
  }
}
