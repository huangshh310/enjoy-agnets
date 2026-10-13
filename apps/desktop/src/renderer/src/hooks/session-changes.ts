/**
 * luna P2：会话级改动（main session.changes）。「N 项」与改动审查回落都按它算：
 * known / none 用会话口径（没写盘 run = 0，跑前已脏文件不算）；unknown（无基线 / git 错）回落整仓口径（fail-closed）。
 */
import { useQuery } from "@tanstack/react-query"
import { SessionChangesResult } from "@enjoy-agents/ipc-contract/session-changes"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"

export function sessionScopedCount(result: SessionChangesResult | null | undefined, workspaceCount: number): number {
  if (!result || result.baseline === "unknown") return workspaceCount
  return result.sessionChangeCount
}

/** 会话口径可信时返回路径；否则 null（调用方保持原整仓逻辑）。 */
export function sessionScopedPaths(result: SessionChangesResult | null | undefined): string[] | null {
  if (!result || result.baseline === "unknown") return null
  return result.paths
}

export function useSessionChanges(): SessionChangesResult | null {
  const sessionId = useChatStore((state) => state.sessionId)
  const changesLoadedAt = useChatStore((state) => state.changesLoadedAt)
  const running = useChatStore((state) => state.running)
  const query = useQuery({
    queryKey: ["session-changes", sessionId, changesLoadedAt, running],
    enabled: hasIde() && Boolean(sessionId),
    queryFn: async () => {
      const parsed = SessionChangesResult.safeParse(await getIde().session.changes({ sessionId }))
      return parsed.success ? parsed.data : null
    }
  })
  if (!sessionId) return null
  return query.data ?? null
}
