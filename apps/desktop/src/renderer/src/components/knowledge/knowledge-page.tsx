/**
 * 知识库主工作台：检索舞台 → 记忆 Bento → 页内索引面板。
 */
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { KnowledgeIndexDrawer } from "./components/drawer/knowledge-index-drawer"
import { KnowledgeMemoryBento } from "./components/bento/knowledge-memory-bento"
import { KnowledgeRetrievalStage } from "./components/retrieval/knowledge-retrieval-stage"
import { KnowledgeAddModal } from "./knowledge-add-modal"
import { KnowledgeEditModal } from "./knowledge-edit-modal"
import { KnowledgeFilePreviewModal } from "./knowledge-file-preview-modal"
import { KnowledgePageHeader } from "./knowledge-page-header"
import { useKnowledgePage } from "./use-knowledge-page"

export function KnowledgePage() {
  const t = useT()
  const page = useKnowledgePage()
  const hitSourceIds = page.hasSearched ? [...new Set(page.hits.map((hit) => hit.sourceId))] : []

  function openIndex() {
    page.setIsIndexDrawerOpen(true)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.knowledge.searchPlaceholder")}
      groups={page.groups}
      selectedId={page.selectedFolder ?? "all"}
      onSelect={(id) => page.setSelectedFolder(id === "all" ? null : id)}
      contentWidth="stage"
      hideChrome
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <KnowledgePageHeader
          stats={page.stats}
          onOpenIndexDrawer={openIndex}
          onAdd={() => page.setIsAddModalOpen(true)}
          onUnavailableClick={() => {
            document.getElementById("knowledge-health")?.scrollIntoView({ behavior: "smooth" })
          }}
        />

        {page.actionError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-caption-2-medium text-rose-600 dark:text-rose-400">
            {page.actionError}
          </div>
        ) : null}

        <KnowledgeRetrievalStage
          query={page.query}
          setQuery={page.setQuery}
          rerank={page.rerank}
          setRerank={page.setRerank}
          hits={page.hits}
          recent={page.recentCitations}
          focusChunkId={page.focusChunkId}
          isSearching={page.isSearching}
          hasSearched={page.hasSearched}
          totalChunks={page.totalChunks}
          activeLensName={page.selectedFolder}
          workspaceDirs={page.workspaceDirPaths}
          indexing={Boolean(page.indexingSourceId)}
          onSearch={page.handleSearch}
          onOpenDrawer={openIndex}
          onOpenAddModal={() => page.setIsAddModalOpen(true)}
          onIndexFolder={(path) => void page.handleIndexFolder(path)}
          onPreviewDoc={(path) => {
            const found = page.documents.find((doc) => doc.path === path)
            if (found) page.openPreview(found)
          }}
          onClearLensFilter={() => page.setSelectedFolder(null)}
          onPin={page.handlePinToChat}
          onFilterSource={(sourceId) => {
            const lens = page.lenses.find((item) => item.id === sourceId)
            if (lens) page.setSelectedFolder(lens.path)
          }}
        />

        <KnowledgeMemoryBento
          stats={page.stats}
          lenses={page.lenses}
          sources={page.sources}
          selectedFolder={page.selectedFolder}
          hitSourceIds={hitSourceIds}
          hasSearched={page.hasSearched}
          onSelectFolder={page.setSelectedFolder}
          onToggleLens={page.toggleLens}
          onSetDefault={page.setDefaultLens}
          onOpenDrawer={openIndex}
          onEditSource={(source) => {
            page.setEditingSource(source)
            page.setIsEditModalOpen(true)
          }}
          onRemoveSource={page.handleRemoveSource}
        />

        <KnowledgeIndexDrawer
          open={page.isIndexDrawerOpen}
          onClose={() => page.setIsIndexDrawerOpen(false)}
          onOpenAddModal={() => page.setIsAddModalOpen(true)}
          sources={page.sources}
          documents={page.documents}
          indexingSourceId={page.indexingSourceId}
          selectedPath={page.selectedFolder}
          documentsLoading={page.documentsQuery.isLoading}
          documentsError={page.documentsError}
          citedPaths={page.citedPaths}
          onRebuildIndex={page.handleRebuildIndex}
          onRemoveSource={page.handleRemoveSource}
          onEditSource={(source) => {
            page.setEditingSource(source)
            page.setIsEditModalOpen(true)
          }}
          onPreviewDocument={page.openPreview}
          onQuickSearchSource={page.handleQuickSearchSource}
          onViewSource={page.setSelectedFolder}
        />
        <KnowledgeAddModal
          isOpen={page.isAddModalOpen}
          onClose={() => page.setIsAddModalOpen(false)}
          isAdding={page.isAdding}
          onAddAndIndex={page.handleIndexFolder}
        />
        <KnowledgeEditModal
          isOpen={page.isEditModalOpen}
          onClose={() => {
            page.setIsEditModalOpen(false)
            page.setEditingSource(null)
          }}
          source={page.editingSource}
          isSaving={page.isSavingEdit}
          onSaveAndReindex={page.handleSaveAndReindexSource}
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
