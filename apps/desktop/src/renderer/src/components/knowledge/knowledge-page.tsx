/**
 * 知识页：来源、文件矩阵、检索。View Files 必须写入 selectedPath。
 */
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { KnowledgeAddModal } from "./knowledge-add-modal"
import { KnowledgeDocumentsTable } from "./knowledge-documents-table"
import { KnowledgeEditModal } from "./knowledge-edit-modal"
import { KnowledgeFilePreviewModal } from "./knowledge-file-preview-modal"
import { KnowledgeFolderCards } from "./knowledge-folder-cards"
import { KnowledgePageHeader } from "./knowledge-page-header"
import { KnowledgeRetrieverDrawer } from "./knowledge-retriever-drawer"
import { useKnowledgePage } from "./use-knowledge-page"

export function KnowledgePage() {
  const page = useKnowledgePage()

  return (
    <SecondaryPageShell
      searchPlaceholder="Search knowledge collections..."
      groups={page.groups}
      selectedId={page.selectedFolder ?? "all"}
      onSelect={(id) => page.setSelectedFolder(id === "all" ? null : id)}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        <KnowledgePageHeader
          fileCount={page.documents.length}
          chunkCount={page.totalChunks}
          isRetrieverOpen={page.isRetrieverOpen}
          onToggleRetriever={() => page.setIsRetrieverOpen((open) => !open)}
          onAdd={() => page.setIsAddModalOpen(true)}
        />
        {page.actionError ? (
          <p className="rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-secondary">
            {page.actionError}
          </p>
        ) : null}

        <KnowledgeFolderCards
          sources={page.sources}
          documents={page.documents}
          workspaceDirPaths={page.workspaceDirPaths}
          indexingSourceId={page.indexingSourceId}
          onIndexFolder={page.handleIndexFolder}
          onSelectFolder={(p) => page.setSelectedFolder((cur) => (cur === p ? null : p))}
          selectedPath={page.selectedFolder}
        />

        <KnowledgeRetrieverDrawer
          isOpen={page.isRetrieverOpen}
          onClose={() => page.setIsRetrieverOpen(false)}
          query={page.query}
          setQuery={page.setQuery}
          rerank={page.rerank}
          setRerank={page.setRerank}
          hits={page.hits}
          isSearching={page.isSearching}
          hasSearched={page.hasSearched}
          onSearch={page.handleSearch}
        />

        <KnowledgeDocumentsTable
          sources={page.sources}
          documents={page.documents}
          indexingSourceId={page.indexingSourceId}
          selectedPath={page.selectedFolder}
          documentsLoading={page.documentsQuery.isLoading || page.documentsQuery.isFetching}
          documentsError={page.documentsError}
          onViewSource={(path) => page.setSelectedFolder(path)}
          onRebuildIndex={page.handleRebuildIndex}
          onRemoveSource={page.handleRemoveSource}
          onEditSource={(src) => {
            page.setEditingSource(src)
            page.setIsEditModalOpen(true)
          }}
          onPreviewDocument={(doc) => {
            page.setPreviewingDoc(doc)
            page.setIsPreviewOpen(true)
          }}
          onQuickSearchSource={page.handleQuickSearchSource}
        />

        <KnowledgeAddModal
          isOpen={page.isAddModalOpen}
          onClose={() => page.setIsAddModalOpen(false)}
          onAddAndIndex={page.handleIndexFolder}
          isAdding={page.isAdding}
        />

        <KnowledgeEditModal
          isOpen={page.isEditModalOpen}
          onClose={() => {
            page.setIsEditModalOpen(false)
            page.setEditingSource(null)
          }}
          source={page.editingSource}
          onSaveAndReindex={page.handleSaveAndReindexSource}
          isSaving={page.isSavingEdit}
        />

        <KnowledgeFilePreviewModal
          isOpen={page.isPreviewOpen}
          onClose={() => {
            page.setIsPreviewOpen(false)
            page.setPreviewingDoc(null)
          }}
          document={page.previewingDoc}
          onSearchInFile={page.handleQuickSearchSource}
        />
      </div>
    </SecondaryPageShell>
  )
}
