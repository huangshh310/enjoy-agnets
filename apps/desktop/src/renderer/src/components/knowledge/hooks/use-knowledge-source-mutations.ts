/**
 * 知识来源的索引 / 重建 / 删除 / 改路径。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import type { TranslateFn } from "@renderer/i18n"
import { knowledgeActionErrorKey } from "../lib/derive-knowledge-stats"
import {
  addAndIndexSource,
  rebuildSourceIndex,
  saveSourcePathAndReindex
} from "../lib/knowledge-source-commands"
import { findSourceIdByPath } from "../lib/knowledge-source-resolve"
import type { KnowledgeStats } from "../types/knowledge-ui.types"

export function useKnowledgeSourceMutations(options: {
  workspaceId: string | null
  sources: KnowledgeSource[]
  selectedFolder: string | null
  stats: KnowledgeStats
  t: TranslateFn
  onNeedAdd: () => void
}) {
  const queryClient = useQueryClient()
  const [indexingSourceId, setIndexingSourceId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  function rememberError(error: unknown) {
    const key = knowledgeActionErrorKey(error)
    if (key === "pathNotFound") {
      setActionError(null)
      return
    }
    setActionError(options.t(`pages.knowledge.${key}`))
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["knowledge", options.workspaceId] })
    await queryClient.invalidateQueries({ queryKey: ["knowledge-documents", options.workspaceId] })
  }

  async function handleIndexFolder(targetPath: string, existingSourceId?: string) {
    if (!options.workspaceId) return
    const sourceId = existingSourceId ?? findSourceIdByPath(options.sources, targetPath)
    if (options.stats.unavailable.some((item) => item.path === targetPath)) {
      throw new Error("Path not found in workspace")
    }
    setActionError(null)
    try {
      if (sourceId) {
        setIndexingSourceId(sourceId)
        await rebuildSourceIndex(sourceId)
      } else {
        setIsAdding(true)
        const createdId = await addAndIndexSource(options.workspaceId, targetPath)
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
      if (options.selectedFolder) {
        await handleIndexFolder(
          options.selectedFolder,
          findSourceIdByPath(options.sources, options.selectedFolder)
        )
        return
      }
      const usable = options.sources.filter((source) => source.status !== "error" && !source.error)
      if (usable.length === 0) {
        options.onNeedAdd()
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
    if (!options.workspaceId || !newPath.trim()) return
    const current = options.sources.find((source) => source.id === oldSourceId)
    setActionError(null)
    setIsSavingEdit(true)
    try {
      const sourceId = await saveSourcePathAndReindex({
        workspaceId: options.workspaceId,
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
      await refresh()
    }
  }

  return {
    indexingSourceId,
    isAdding,
    actionError,
    isSavingEdit,
    handleIndexFolder,
    handleIndexCurrentLens,
    handleRebuildIndex,
    handleRemoveSource,
    handleSaveAndReindexSource
  }
}
