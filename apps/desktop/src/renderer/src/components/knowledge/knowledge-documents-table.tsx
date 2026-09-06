/**
 * 知识文件矩阵：文档 tab 与来源 tab。过滤逻辑在 knowledge-document-filters。
 */
import { useMemo, useState } from "react"
import { KnowledgeTableDocFilters } from "./components/table/knowledge-table-doc-filters"
import { KnowledgeTableToolbar } from "./components/table/knowledge-table-toolbar"
import { filterKnowledgeDocuments, filterKnowledgeSources } from "./knowledge-document-filters"
import { KnowledgeDocumentList, KnowledgeDocumentsEmpty } from "./knowledge-document-list"
import { KnowledgeSourcesTable } from "./knowledge-sources-table"
import { sortByKnowledgeField } from "./knowledge-table-format"
import type {
  KnowledgeDocumentsTableProps,
  KnowledgeSortField,
  KnowledgeTabMode,
  KnowledgeViewMode
} from "./knowledge-table.types"

export function KnowledgeDocumentsTable({
  sources,
  documents,
  indexingSourceId,
  selectedPath,
  documentsLoading,
  documentsError,
  citedPaths,
  onRebuildIndex,
  onRemoveSource,
  onEditSource,
  onPreviewDocument,
  onQuickSearchSource,
  onViewSource
}: KnowledgeDocumentsTableProps) {
  const [tabMode, setTabMode] = useState<KnowledgeTabMode>("documents")
  const [statusFilter, setStatusFilter] = useState<"all" | "askable" | "unindexed">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [sortField, setSortField] = useState<KnowledgeSortField>("updated")
  const [viewMode, setViewMode] = useState<KnowledgeViewMode>("table")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const askableDocsCount = useMemo(
    () => documents.filter((doc) => (doc.chunkCount ?? 0) > 0).length,
    [documents]
  )
  const filteredSources = useMemo(
    () =>
      sortByKnowledgeField(filterKnowledgeSources(sources, { selectedPath, searchQuery }), sortField),
    [sources, selectedPath, searchQuery, sortField]
  )
  const filteredDocuments = useMemo(
    () =>
      sortByKnowledgeField(
        filterKnowledgeDocuments(documents, { selectedPath, selectedFormat, searchQuery, statusFilter }),
        sortField
      ),
    [documents, selectedPath, selectedFormat, searchQuery, statusFilter, sortField]
  )
  const paginatedDocs = filteredDocuments.slice((page - 1) * pageSize, page * pageSize)

  function resetPage() {
    setPage(1)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3.5">
      <KnowledgeTableToolbar
        tabMode={tabMode}
        documentsCount={askableDocsCount}
        sourcesCount={filteredSources.length}
        searchQuery={searchQuery}
        sortField={sortField}
        viewMode={viewMode}
        onTabChange={(tab) => {
          setTabMode(tab)
          resetPage()
        }}
        onSearchChange={(value) => {
          setSearchQuery(value)
          resetPage()
        }}
        onSortChange={setSortField}
        onViewModeChange={setViewMode}
      />
      {tabMode === "documents" ? (
        <KnowledgeTableDocFilters
          documents={documents}
          askableCount={askableDocsCount}
          statusFilter={statusFilter}
          selectedFormat={selectedFormat}
          onStatusChange={(status) => {
            setStatusFilter(status)
            resetPage()
          }}
          onFormatChange={(format) => {
            setSelectedFormat(format)
            resetPage()
          }}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tabMode === "documents" ? (
          filteredDocuments.length === 0 ? (
            <KnowledgeDocumentsEmpty loading={documentsLoading} error={documentsError} />
          ) : (
            <KnowledgeDocumentList
              documents={paginatedDocs}
              viewMode={viewMode}
              page={page}
              pageSize={pageSize}
              total={filteredDocuments.length}
              citedPaths={citedPaths}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                resetPage()
              }}
              onPreviewDocument={onPreviewDocument}
              onQuickSearchSource={onQuickSearchSource}
            />
          )
        ) : (
          <KnowledgeSourcesTable
            sources={filteredSources}
            indexingSourceId={indexingSourceId}
            onViewSource={(path) => {
              onViewSource?.(path)
              setTabMode("documents")
              resetPage()
            }}
            onRebuildIndex={onRebuildIndex}
            onRemoveSource={onRemoveSource}
            onEditSource={onEditSource}
          />
        )}
      </div>
    </section>
  )
}
