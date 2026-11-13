/**
 * 提示收藏：拉库 + 合本会话召回 + 搜滤 + 星标写盘。
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import type { PromptLibraryEntry } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { listRecallPrompts } from "@renderer/lib/user-message-text"
import { useChatStore } from "@renderer/stores/chat-store"
import { mergePromptLibraryRows } from "./merge-prompt-library-rows.ts"
import type { PromptLibraryRow } from "./prompt-library-types.ts"

export function usePromptLibrary(open: boolean) {
  const messages = useChatStore((s) => s.messages)
  const [library, setLibrary] = useState<PromptLibraryEntry[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!hasIde()) return
    setLoading(true)
    try {
      const raw = (await getIde().settings.promptLibrary()) as PromptLibraryEntry[]
      setLibrary(Array.isArray(raw) ? raw : [])
    } catch {
      setLibrary([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const sessionPrompts = useMemo(() => listRecallPrompts(messages), [messages])

  const { starred, recent } = useMemo(
    () => mergePromptLibraryRows({ sessionPrompts, library, query }),
    [sessionPrompts, library, query]
  )

  const toggleStar = useCallback(
    async (row: PromptLibraryRow) => {
      if (!hasIde()) return
      const nextStarred = !row.starred
      const id = row.source === "library" ? row.id : undefined
      const saved = (await getIde().settings.savePromptLibraryEntry({
        id,
        text: row.text,
        starred: nextStarred
      })) as PromptLibraryEntry[]
      setLibrary(Array.isArray(saved) ? saved : [])
    },
    []
  )

  return {
    query,
    setQuery,
    starred,
    recent,
    loading,
    empty: starred.length === 0 && recent.length === 0,
    toggleStar,
    refresh
  }
}
