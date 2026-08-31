/**
 * 知识页：来源、文件矩阵、检索。View Files 必须写入 selectedPath。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiStackLine } from "@remixicon/react"
import type {
  KnowledgeDocumentItem,
  KnowledgeHit,
  KnowledgeSource
} from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { KnowledgeAddModal } from "./knowledge-add-modal"
import { KNOWLEDGE_PRESET_FOLDERS } from "./knowledge-constants"
import { KnowledgeDocumentsTable } from "./knowledge-documents-table"
import { KnowledgeEditModal } from "./knowledge-edit-modal"
import { KnowledgeFilePreviewModal } from "./knowledge-file-preview-modal"
import { isSameKnowledgeSourcePath } from "./knowledge-edit-path"
import { KnowledgeFolderCards } from "./knowledge-folder-cards"
import { KnowledgePageHeader } from "./knowledge-page-header"
import { KnowledgeRetrieverDrawer } from "./knowledge-retriever-drawer"

export function KnowledgePage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)

  // State
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isRetrieverOpen, setIsRetrieverOpen] = useState(false)
  const [indexingSourceId, setIndexingSourceId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Preview Modal State
  const [previewingDoc, setPreviewingDoc] = useState<KnowledgeDocumentItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Retriever Query State
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<KnowledgeHit[]>([])
  const [rerank, setRerank] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Query Knowledge Sources
  const sourcesQuery = useQuery({
    queryKey: ["knowledge", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().knowledge.sources(workspaceId!) as Promise<KnowledgeSource[]>,
    refetchInterval: (query) => {
      const data = query.state.data as KnowledgeSource[] | undefined
      return data?.some((s) => s.status === "indexing") ? 1500 : false
    }
  })
  const sources = sourcesQuery.data ?? []

  // Query Indexed Documents
  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents", workspaceId, indexingSourceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () =>
      getIde().knowledge.documents({
        workspaceId: workspaceId!
      }) as Promise<KnowledgeDocumentItem[]>,
    refetchInterval: () => {
      if (indexingSourceId) return 1500
      return sourcesQuery.data?.some((s) => s.status === "indexing") ? 1500 : false
    }
  })
  const documents = documentsQuery.data ?? []
  const documentsError = documentsQuery.error ? String(documentsQuery.error) : null
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunkCount || 0), 0)

  const workspaceDirsQuery = useQuery({
    queryKey: ["workspace-root-dirs", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: async () => {
      const entries = (await getIde().workspace.files({
        workspaceId: workspaceId!,
        path: "."
      })) as Array<{ kind: string; path: string }>
      return entries.filter((entry) => entry.kind === "directory").map((entry) => entry.path)
    }
  })
  const workspaceDirPaths = workspaceDirsQuery.data ?? []

  // Sidebar Group Hierarchy
  const groups = useMemo(() => {
    const folderItems = [
      {
        id: "all",
        label: "All Knowledge",
        icon: RiStackLine,
        meta: String(documents.length || sources.length)
      },
      ...KNOWLEDGE_PRESET_FOLDERS.map((preset) => {
        const docCount = documents.filter(
          (d) =>
            d.sourcePath === preset.path ||
            d.path === preset.path ||
            d.path.startsWith(`${preset.path}/`)
        ).length
        const srcCount = sources.filter(
          (s) => s.path === preset.path || s.path.startsWith(`${preset.path}/`)
        ).length
        return {
          id: preset.path,
          label: preset.name,
          icon: preset.icon,
          meta: String(docCount || srcCount)
        }
      })
    ]

    return [
      {
        id: "collections",
        label: "Knowledge Collections",
        items: folderItems
      }
    ]
  }, [sources, documents])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
    await queryClient.invalidateQueries({ queryKey: ["knowledge-documents", workspaceId] })
  }

  // Index Action Handlers
  async function handleIndexFolder(targetPath: string, existingSourceId?: string) {
    if (!workspaceId) return
    setActionError(null)
    let sourceId = existingSourceId
    if (!sourceId) {
      setIsAdding(true)
      try {
        const created = (await getIde().knowledge.addSource({
          workspaceId,
          path: targetPath
        })) as KnowledgeSource
        sourceId = created.id
        await refresh()
      } catch (error) {
        setActionError(error instanceof Error ? error.message : String(error))
        return
      } finally {
        setIsAdding(false)
      }
    }

    if (sourceId) {
      setIndexingSourceId(sourceId)
      try {
        await getIde().knowledge.index({ sourceId, rebuild: true })
      } catch (error) {
        setActionError(error instanceof Error ? error.message : String(error))
      } finally {
        setIndexingSourceId(null)
        await refresh()
      }
    }
  }

  async function handleRebuildIndex(sourceId: string) {
    setActionError(null)
    setIndexingSourceId(sourceId)
    try {
      await getIde().knowledge.index({ sourceId, rebuild: true })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIndexingSourceId(null)
      await refresh()
    }
  }

  async function handleRemoveSource(sourceId: string) {
    await getIde().knowledge.remove(sourceId)
    await refresh()
  }

  // Edit and update source path
  async function handleSaveAndReindexSource(oldSourceId: string, newPath: string) {
    if (!workspaceId || !newPath.trim()) return
    const current = sources.find((source) => source.id === oldSourceId)
    const samePath = current && isSameKnowledgeSourcePath(newPath, current.path)
    setActionError(null)
    setIsSavingEdit(true)
    try {
      if (samePath) {
        setIndexingSourceId(oldSourceId)
        await getIde().knowledge.index({ sourceId: oldSourceId, rebuild: true })
        return
      }
      await getIde().knowledge.remove(oldSourceId)
      const created = (await getIde().knowledge.addSource({
        workspaceId,
        path: newPath.trim()
      })) as KnowledgeSource
      await refresh()
      setIndexingSourceId(created.id)
      await getIde().knowledge.index({ sourceId: created.id, rebuild: true })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSavingEdit(false)
      setIndexingSourceId(null)
      setEditingSource(null)
      await refresh()
    }
  }

  // Search Action Handler
  async function handleSearch() {
    if (!workspaceId || !query.trim() || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const result = (await getIde().knowledge.search({
        workspaceId,
        query: query.trim(),
        limit: 10,
        rerank
      })) as KnowledgeHit[]
      setHits(result)
    } finally {
      setIsSearching(false)
    }
  }

  function handleQuickSearchSource(sourcePath: string) {
    setQuery(`source:${sourcePath} `)
    setIsRetrieverOpen(true)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Search knowledge collections..."
      groups={groups}
      selectedId={selectedFolder ?? "all"}
      onSelect={(id) => setSelectedFolder(id === "all" ? null : id)}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        <KnowledgePageHeader
          fileCount={documents.length}
          chunkCount={totalChunks}
          isRetrieverOpen={isRetrieverOpen}
          onToggleRetriever={() => setIsRetrieverOpen((open) => !open)}
          onAdd={() => setIsAddModalOpen(true)}
        />
        {actionError ? (
          <p className="rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-secondary">
            {actionError}
          </p>
        ) : null}

        <KnowledgeFolderCards
          sources={sources}
          documents={documents}
          workspaceDirPaths={workspaceDirPaths}
          indexingSourceId={indexingSourceId}
          onIndexFolder={handleIndexFolder}
          onSelectFolder={(p) => setSelectedFolder((cur) => (cur === p ? null : p))}
          selectedPath={selectedFolder}
        />

        {/* Semantic Retriever Drawer (Slide over / Expandable) */}
        <KnowledgeRetrieverDrawer
          isOpen={isRetrieverOpen}
          onClose={() => setIsRetrieverOpen(false)}
          query={query}
          setQuery={setQuery}
          rerank={rerank}
          setRerank={setRerank}
          hits={hits}
          isSearching={isSearching}
          hasSearched={hasSearched}
          onSearch={handleSearch}
        />

        {/* Files & Documents Matrix Table */}
        <KnowledgeDocumentsTable
          sources={sources}
          documents={documents}
          indexingSourceId={indexingSourceId}
          selectedPath={selectedFolder}
          documentsLoading={documentsQuery.isLoading || documentsQuery.isFetching}
          documentsError={documentsError}
          onViewSource={(path) => setSelectedFolder(path)}
          onRebuildIndex={handleRebuildIndex}
          onRemoveSource={handleRemoveSource}
          onEditSource={(src) => {
            setEditingSource(src)
            setIsEditModalOpen(true)
          }}
          onPreviewDocument={(doc) => {
            setPreviewingDoc(doc)
            setIsPreviewOpen(true)
          }}
          onQuickSearchSource={handleQuickSearchSource}
        />

        {/* Add / Import Source Modal Dialog */}
        <KnowledgeAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddAndIndex={handleIndexFolder}
          isAdding={isAdding}
        />

        {/* Edit Source Path Modal Dialog */}
        <KnowledgeEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingSource(null)
          }}
          source={editingSource}
          onSaveAndReindex={handleSaveAndReindexSource}
          isSaving={isSavingEdit}
        />

        {/* Document File Preview Modal */}
        <KnowledgeFilePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false)
            setPreviewingDoc(null)
          }}
          document={previewingDoc}
          onSearchInFile={handleQuickSearchSource}
        />
      </div>
    </SecondaryPageShell>
  )
}
