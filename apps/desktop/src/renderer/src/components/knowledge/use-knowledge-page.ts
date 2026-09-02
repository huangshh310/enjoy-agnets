/**
 * 知识页状态：来源、文档、索引、检索。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiStackLine } from "@remixicon/react"
import type {
  KnowledgeDocumentItem,
  KnowledgeHit,
  KnowledgeSource
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { getKnowledgePresetFolders } from "./knowledge-constants"
import { isSameKnowledgeSourcePath } from "./knowledge-edit-path"

export function useKnowledgePage() {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isRetrieverOpen, setIsRetrieverOpen] = useState(false)
  const [indexingSourceId, setIndexingSourceId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [previewingDoc, setPreviewingDoc] = useState<KnowledgeDocumentItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<KnowledgeHit[]>([])
  const [rerank, setRerank] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const sourcesQuery = useQuery({
    queryKey: ["knowledge", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () => getIde().knowledge.sources(workspaceId!) as Promise<KnowledgeSource[]>,
    refetchInterval: (q) => {
      const data = q.state.data as KnowledgeSource[] | undefined
      return data?.some((s) => s.status === "indexing") ? 1500 : false
    }
  })
  const sources = sourcesQuery.data ?? []

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

  const groups = useMemo(() => {
    const presets = getKnowledgePresetFolders(t)
    const folderItems = [
      {
        id: "all",
        label: t("pages.knowledge.navAll"),
        icon: RiStackLine,
        meta: String(documents.length || sources.length)
      },
      ...presets.map((preset) => {
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
        label: t("pages.knowledge.navCollections"),
        items: folderItems
      }
    ]
  }, [sources, documents, t])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
    await queryClient.invalidateQueries({ queryKey: ["knowledge-documents", workspaceId] })
  }

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

  return {
    selectedFolder,
    setSelectedFolder,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingSource,
    setEditingSource,
    isSavingEdit,
    isRetrieverOpen,
    setIsRetrieverOpen,
    indexingSourceId,
    isAdding,
    actionError,
    previewingDoc,
    setPreviewingDoc,
    isPreviewOpen,
    setIsPreviewOpen,
    query,
    setQuery,
    hits,
    rerank,
    setRerank,
    isSearching,
    hasSearched,
    sources,
    documents,
    documentsError,
    documentsQuery,
    totalChunks,
    workspaceDirPaths,
    groups,
    handleIndexFolder,
    handleRebuildIndex,
    handleRemoveSource,
    handleSaveAndReindexSource,
    handleSearch,
    handleQuickSearchSource
  }
}
