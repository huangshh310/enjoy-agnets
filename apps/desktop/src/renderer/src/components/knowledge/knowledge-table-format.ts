import type { TranslateFn } from "@renderer/i18n"
import type { KnowledgeSortField } from "./knowledge-table.types"

export function getPathExtension(path: string): string | null {
  const name = path.replace(/\\/g, "/").split("/").pop() ?? path
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1) : null
}

export function formatRelativeTime(timestamp: number, t: TranslateFn): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return t("pages.knowledge.justNow")
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t("pages.knowledge.minutesAgo", { minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("pages.knowledge.hoursAgo", { hours })
  return t("pages.knowledge.daysAgo", { days: Math.floor(hours / 24) })
}

export function sortByKnowledgeField<T extends { path: string; chunkCount: number; updatedAt: number }>(
  list: T[],
  sortField: KnowledgeSortField
): T[] {
  return [...list].sort((a, b) => {
    if (sortField === "updated") return b.updatedAt - a.updatedAt
    if (sortField === "name") return a.path.localeCompare(b.path)
    return b.chunkCount - a.chunkCount
  })
}

export function knowledgeSourceStatusLabel(
  t: TranslateFn,
  status: string,
  isIndexing: boolean
): string {
  if (isIndexing) return t("pages.knowledge.statusIndexing")
  if (status === "ready") return t("pages.knowledge.statusReady")
  if (status === "error") return t("pages.knowledge.statusError")
  if (status === "paused") return t("pages.knowledge.statusPaused")
  return status
}

export function knowledgeDocumentStatusLabel(
  t: TranslateFn,
  status: string,
  chunkCount: number
): string {
  if (chunkCount > 0) return t("pages.knowledge.statusAskable")
  if (status === "unindexed") return t("pages.knowledge.statusScannedOnly")
  if (status === "indexing") return t("pages.knowledge.statusIndexing")
  if (status === "error") return t("pages.knowledge.statusError")
  if (status === "ready") return t("pages.knowledge.statusReady")
  return status
}
