/**
 * 会话压缩状态：查询 / 压缩 / 清除。错误码在 UI 翻成词表。
 */
import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { COMPACTION_ERROR, type SessionCompaction } from "@enjoy-agents/ipc-contract"
import { DEFAULT_KEEP_RECENT } from "@enjoy-agents/agent-core/compaction"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export const SESSION_COMPACTION_QUERY = "session-compaction"

export function useSessionCompaction(sessionId: string | null) {
  const queryClient = useQueryClient()
  const t = useT()
  const [isCompacting, setIsCompacting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryKey = [SESSION_COMPACTION_QUERY, sessionId]

  const query = useQuery({
    queryKey,
    enabled: Boolean(hasIde() && sessionId),
    queryFn: async (): Promise<SessionCompaction | null> => {
      if (!sessionId) return null
      return (await getIde().session.getCompaction({ sessionId })) as SessionCompaction | null
    }
  })

  const compact = useCallback(
    async (keepRecent = DEFAULT_KEEP_RECENT): Promise<SessionCompaction | null> => {
      if (!sessionId || !hasIde()) return null
      setIsCompacting(true)
      setError(null)
      try {
        const result = (await getIde().session.compact({
          sessionId,
          keepRecent
        })) as SessionCompaction
        queryClient.setQueryData(queryKey, result)
        void queryClient.invalidateQueries({ queryKey: [SESSION_COMPACTION_QUERY] })
        return result
      } catch (err) {
        const msg = localizeCompactionError(err, t)
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsCompacting(false)
      }
    },
    [sessionId, queryClient, queryKey, t]
  )

  const clearCompaction = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !hasIde()) return false
    setError(null)
    try {
      await getIde().session.clearCompaction({ sessionId })
      queryClient.setQueryData(queryKey, null)
      void queryClient.invalidateQueries({ queryKey: [SESSION_COMPACTION_QUERY] })
      return true
    } catch (err) {
      setError(localizeCompactionError(err, t))
      return false
    }
  }, [sessionId, queryClient, queryKey, t])

  return {
    compaction: query.data ?? null,
    isLoading: query.isLoading,
    isCompacting,
    error,
    compact,
    clearCompaction,
    refetch: query.refetch
  }
}

function localizeCompactionError(err: unknown, t: (key: string) => string): string {
  const raw = err instanceof Error ? err.message : ""
  if (raw.includes(COMPACTION_ERROR.tooShort)) return t("chat.compactSessionTooShort")
  if (raw.includes(COMPACTION_ERROR.notEligible)) return t("chat.compactSessionFailed")
  return t("chat.compactSessionFailed")
}
