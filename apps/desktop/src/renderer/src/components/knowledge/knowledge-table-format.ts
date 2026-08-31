import type { KnowledgeSortField } from "./knowledge-table.types"

export function getPathExtension(path: string): string | null {
  const name = path.replace(/\\/g, "/").split("/").pop() ?? path
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1) : null
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
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
