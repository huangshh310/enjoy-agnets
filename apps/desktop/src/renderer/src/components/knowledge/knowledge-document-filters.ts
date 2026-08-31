/**
 * 知识页文档 / 来源列表过滤。View Files 必须按 selectedPath 收窄。
 */

export type KnowledgeFilterInput = {
  selectedPath?: string | null
  selectedFormat?: string | null
  searchQuery?: string
}

export type KnowledgeDocumentFilterItem = {
  sourcePath: string
  path: string
  chunkCount: number
  updatedAt: number
}

export type KnowledgeSourceFilterItem = {
  path: string
  chunkCount: number
  updatedAt: number
}

export function filterKnowledgeDocuments<T extends KnowledgeDocumentFilterItem>(
  documents: T[],
  input: KnowledgeFilterInput
): T[] {
  const selectedPath = input.selectedPath?.trim() || null
  const selectedFormat = input.selectedFormat ?? null
  const query = input.searchQuery?.trim().toLowerCase() ?? ""
  return documents.filter((doc) => {
    if (selectedPath && !matchesSelectedPath(doc.sourcePath, doc.path, selectedPath)) {
      return false
    }
    if (selectedFormat && !doc.path.endsWith(selectedFormat)) return false
    if (query && !doc.path.toLowerCase().includes(query)) return false
    return true
  })
}

export function filterKnowledgeSources<T extends KnowledgeSourceFilterItem>(
  sources: T[],
  input: KnowledgeFilterInput
): T[] {
  const selectedPath = input.selectedPath?.trim() || null
  const query = input.searchQuery?.trim().toLowerCase() ?? ""
  return sources.filter((source) => {
    if (selectedPath && !matchesSelectedPath(source.path, source.path, selectedPath)) {
      return false
    }
    if (query && !source.path.toLowerCase().includes(query)) return false
    return true
  })
}

function matchesSelectedPath(sourcePath: string, filePath: string, selectedPath: string): boolean {
  return (
    sourcePath === selectedPath ||
    filePath === selectedPath ||
    filePath.startsWith(`${selectedPath}/`) ||
    sourcePath.startsWith(`${selectedPath}/`)
  )
}
