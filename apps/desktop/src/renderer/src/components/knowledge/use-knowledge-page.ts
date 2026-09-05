/**
 * 知识页状态：来源、文档、索引、检索。透镜范围在前端收窄命中。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiFolderLine, RiStackLine } from "@remixicon/react"
import type {
  KnowledgeDocumentItem,
  KnowledgeHit,
  KnowledgeSource
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { addSessionContextChip } from "@renderer/hooks/session-context-chips"

import { deriveKnowledgeStats, knowledgeActionErrorKey } from "./lib/derive-knowledge-stats"
import { filterKnowledgeHits, resolveEnabledSourceIds } from "./lib/filter-knowledge-hits"
import {
  addAndIndexSource,
  rebuildSourceIndex,
  saveSourcePathAndReindex
} from "./lib/knowledge-source-commands"
import { findSourceIdByPath } from "./lib/knowledge-source-resolve"
import { mergeRecentHits } from "./lib/merge-recent-hits"
import type { KnowledgeLens } from "./types/knowledge-ui.types"

function defaultLensKey(workspaceId: string): string {
  return `enjoy:knowledge:default-lens:${workspaceId}`
}

export function useKnowledgePage() {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false)
  const [indexingSourceId, setIndexingSourceId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [previewingDoc, setPreviewingDoc] = useState<KnowledgeDocumentItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<KnowledgeHit[]>([])
  const [recentCitations, setRecentCitations] = useState<KnowledgeHit[]>([])
  const [citedPaths, setCitedPaths] = useState<string[]>([])
  const [rerank, setRerank] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [defaultLensId, setDefaultLensIdState] = useState<string | null>(null)
  const [disabledLensIds, setDisabledLensIds] = useState<Set<string>>(new Set())
  const appliedDefaultLens = useRef(false)

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
      getIde().knowledge.documents({ workspaceId: workspaceId! }) as Promise<KnowledgeDocumentItem[]>,
    refetchInterval: () => {
      if (indexingSourceId) return 1500
      return sourcesQuery.data?.some((s) => s.status === "indexing") ? 1500 : false
    }
  })
  const documents = documentsQuery.data ?? []
  const documentsError = documentsQuery.error ? t("pages.knowledge.couldNotList") : null
  const stats = useMemo(() => deriveKnowledgeStats(sources, documents), [sources, documents])
  const totalChunks = stats.askableChunks

  const workspaceDirsQuery = useQuery({
    queryKey: ["workspace-root-dirs", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return []
      const entries = (await getIde().workspace.files({
        workspaceId,
        path: "."
      })) as Array<{ kind: string; path: string }>
      return entries.filter((e) => e.kind === "directory").map((e) => e.path)
    }
  })
  const workspaceDirPaths = workspaceDirsQuery.data ?? []
  useEffect(() => {
    if (!workspaceId) return
    const stored = localStorage.getItem(defaultLensKey(workspaceId))
    setDefaultLensIdState(stored)
  }, [workspaceId])

  const lenses = useMemo<KnowledgeLens[]>(() => {
    return sources
      .filter((source) => source.status !== "error" && !source.error)
      .map((source) => ({
        id: source.id,
        path: source.path,
        label: source.path.split("/").pop() || source.path,
        chunkCount: source.chunkCount || 0,
        ready: (source.chunkCount || 0) > 0,
        enabled: !disabledLensIds.has(source.id),
        isDefault: defaultLensId === source.id
      }))
  }, [sources, disabledLensIds, defaultLensId])

  useEffect(() => {
    if (appliedDefaultLens.current) return
    const lens = lenses.find((item) => item.isDefault)
    if (!lens) return
    appliedDefaultLens.current = true
    setSelectedFolder(lens.path)
  }, [lenses])

  const enabledSourceIds = useMemo(
    () => resolveEnabledSourceIds(lenses, selectedFolder),
    [lenses, selectedFolder]
  )

  const groups = useMemo(() => {
    const folderItems = [
      {
        id: "all",
        label: t("pages.knowledge.navAll"),
        icon: RiStackLine,
        meta: String(stats.askableChunks)
      },
      ...sources
        .filter((source) => source.status !== "error" && !source.error)
        .map((source) => ({
          id: source.path,
          label: source.path,
          icon: RiFolderLine,
          meta: t("pages.knowledge.navChunks", { n: source.chunkCount || 0 })
        }))
    ]
    return [{ id: "collections", label: t("pages.knowledge.navCollections"), items: folderItems }]
  }, [stats.askableChunks, sources, t])
  function rememberError(error: unknown) {
    const key = knowledgeActionErrorKey(error)
    if (key === "pathNotFound") {
      setActionError(null)
      return
    }
    setActionError(t(`pages.knowledge.${key}`))
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] })
    await queryClient.invalidateQueries({ queryKey: ["knowledge-documents", workspaceId] })
  }

  function setDefaultLens(id: string) {
    setDefaultLensIdState(id)
    if (workspaceId) localStorage.setItem(defaultLensKey(workspaceId), id)
  }

  function toggleLens(id: string) {
    setDisabledLensIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function handleIndexFolder(targetPath: string, existingSourceId?: string) {
    if (!workspaceId) return
    const sourceId = existingSourceId ?? findSourceIdByPath(sources, targetPath)
    if (stats.unavailable.some((item) => item.path === targetPath)) {
      throw new Error("Path not found in workspace")
    }
    setActionError(null)
    try {
      if (sourceId) {
        setIndexingSourceId(sourceId)
        await rebuildSourceIndex(sourceId)
      } else {
        setIsAdding(true)
        const createdId = await addAndIndexSource(workspaceId, targetPath)
        setIndexingSourceId(createdId)
      }
    } catch (error) {
      rememberError(error)
      throw error
    } finally {
      setIsAdding(false)
      setIndexingSourceId(null)
      await refresh()
    }
  }

  async function handleIndexCurrentLens() {
    try {
      if (selectedFolder) {
        await handleIndexFolder(selectedFolder, findSourceIdByPath(sources, selectedFolder))
        return
      }
      const usable = sources.filter((source) => source.status !== "error" && !source.error)
      if (usable.length === 0) {
        setIsAddModalOpen(true)
        return
      }
      for (const source of usable) {
        await handleRebuildIndex(source.id)
      }
    } catch {
      // 横幅 / 健康卡已更新
    }
  }

  async function handleRebuildIndex(sourceId: string) {
    setActionError(null)
    setIndexingSourceId(sourceId)
    try {
      await rebuildSourceIndex(sourceId)
    } catch (error) {
      rememberError(error)
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
    setActionError(null)
    setIsSavingEdit(true)
    try {
      const sourceId = await saveSourcePathAndReindex({
        workspaceId,
        oldSourceId,
        newPath,
        currentPath: current?.path
      })
      setIndexingSourceId(sourceId)
    } catch (error) {
      rememberError(error)
    } finally {
      setIsSavingEdit(false)
      setIndexingSourceId(null)
      setEditingSource(null)
      await refresh()
    }
  }

  async function runSearch(
    nextQuery: string,
    folder: string | null = selectedFolder,
    sourceIds: readonly string[] = enabledSourceIds
  ) {
    if (!workspaceId || !nextQuery.trim() || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const result = (await getIde().knowledge.search({
        workspaceId,
        query: nextQuery.trim(),
        limit: 10,
        rerank
      })) as KnowledgeHit[]
      const filtered = filterKnowledgeHits(result, { enabledSourceIds: sourceIds, selectedPath: folder })
      setHits(filtered)
      setRecentCitations((prev) => mergeRecentHits(filtered, prev))
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSearch() {
    await runSearch(query)
  }

  function handleQuickSearchSource(filePath: string) {
    const doc = documents.find((item) => item.path === filePath)
    const folder = doc?.sourcePath ?? selectedFolder
    if (folder) setSelectedFolder(folder)
    const name = filePath.replaceAll("\\", "/").split("/").pop() || filePath
    setQuery(name)
    setIsIndexDrawerOpen(false)
    void runSearch(name, folder, resolveEnabledSourceIds(lenses, folder))
  }
  function handlePinToChat(hit: KnowledgeHit) {
    const parts = hit.path.replaceAll("\\", "/").split("/")
    addSessionContextChip({
      id: hit.chunkId,
      kind: "knowledge",
      label: parts.at(-1) || hit.path,
      path: hit.path,
      snippet: hit.snippet
    })
    setCitedPaths((prev) => (prev.includes(hit.path) ? prev : [...prev, hit.path]))
  }

  function openPreview(doc: KnowledgeDocumentItem) {
    setSelectedFolder(doc.sourcePath)
    setPreviewingDoc(doc)
    setIsPreviewOpen(true)
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
    isIndexDrawerOpen,
    setIsIndexDrawerOpen,
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
    recentCitations,
    citedPaths,
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
    stats,
    lenses,
    enabledSourceIds,
    toggleLens,
    setDefaultLens,
    handleIndexFolder,
    handleIndexCurrentLens,
    handleRebuildIndex,
    handleRemoveSource,
    handleSaveAndReindexSource,
    handleSearch,
    handleQuickSearchSource,
    handlePinToChat,
    openPreview
  }
}
