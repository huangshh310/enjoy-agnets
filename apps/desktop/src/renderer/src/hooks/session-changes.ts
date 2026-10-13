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

type ChangeRow = { path: string; additions?: number; deletions?: number }

/**
 * 侧栏当前会话行的 +/-：会话口径可信时只加本会话 paths 的行（只读会话 = 0，不出徽标）；
 * 不可信（unknown / 还没取到）保持整仓口径。
 */
export function sessionChangesSummary(
  result: SessionChangesResult | null | undefined,
  changes: readonly ChangeRow[],
  workspace: { additions: number; deletions: number }
): { additions: number; deletions: number } {
  const paths = sessionScopedPaths(result)
  if (!paths) return workspace
  const mine = new Set(paths)
  let additions = 0
  let deletions = 0
  for (const row of changes) {
    if (!mine.has(row.path)) continue
    additions += row.additions ?? 0
    deletions += row.deletions ?? 0
  }
  // 会话改了但 git 行统计为 0（如新建空文件 / 二进制）：至少给 +N 文件数，不吞改动。
  if (additions === 0 && deletions === 0 && paths.length > 0) additions = paths.length
  return { additions, deletions }
}

export function useSessionChangesSummary(): { additions: number; deletions: number } {
  const result = useSessionChanges()
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  return sessionChangesSummary(result, changes, { additions, deletions })
}
