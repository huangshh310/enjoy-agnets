/**
 * Composer `/compact` 与检查器按钮共用：压缩本会话上下文。
 */
import { DEFAULT_KEEP_RECENT } from "@enjoy-agents/agent-core/compaction"
import type { SessionCompaction } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { queryClient } from "@renderer/lib/query-client"
import { useChatStore } from "@renderer/stores/chat-store"
import { localizeCompactionError } from "./compaction-error.ts"
import { SESSION_COMPACTION_QUERY } from "./use-session-compaction"

export async function runSessionCompact(sessionId: string): Promise<SessionCompaction | null> {
  if (!hasIde() || !sessionId) return null
  const result = (await getIde().session.compact({
    sessionId,
    keepRecent: DEFAULT_KEEP_RECENT
  })) as SessionCompaction
  queryClient.setQueryData([SESSION_COMPACTION_QUERY, sessionId], result)
  void queryClient.invalidateQueries({ queryKey: [SESSION_COMPACTION_QUERY] })
  return result
}

/** 等压缩完成再继续发送。失败翻词表，不把 `/compact` 发给模型。 */
export async function compactSessionOrReport(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false
  try {
    await runSessionCompact(sessionId)
    return true
  } catch (error) {
    useChatStore.getState().setError(localizeCompactionError(error))
    return false
  }
}
