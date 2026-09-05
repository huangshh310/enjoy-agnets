import type {
  KnowledgeDocumentItem,
  KnowledgeSource
} from "@enjoy-agents/ipc-contract"

export type KnowledgeTabMode = "documents" | "sources"
export type KnowledgeSortField = "updated" | "name" | "chunks"
export type KnowledgeViewMode = "table" | "grid"

export type KnowledgeDocumentsTableProps = {
  sources: KnowledgeSource[]
  documents: KnowledgeDocumentItem[]
  indexingSourceId: string | null
  selectedPath: string | null
  documentsLoading?: boolean
  documentsError?: string | null
  citedPaths?: readonly string[]
  onRebuildIndex: (sourceId: string) => Promise<void>
  onRemoveSource: (sourceId: string) => Promise<void>
  onEditSource?: (source: KnowledgeSource) => void
  onPreviewDocument?: (doc: KnowledgeDocumentItem) => void
  onQuickSearchSource?: (sourcePath: string) => void
  onViewSource?: (path: string) => void
}
