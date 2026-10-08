/**
 * 路由或会话一变，就记进当前窗口的历史。恢复进行中先挂起，结束再对账。
 */
import { useEffect, useMemo } from "react"
import { useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { deriveHistoryEntry, materializeEntry } from "@renderer/hooks/nav-history/derive-entry"
import { syncObservedEntry } from "@renderer/hooks/nav-history/nav-history-controller"

export function useNavHistorySync(): void {
  const t = useT()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useRouterState({ select: (state) => state.location.search }) as Record<string, unknown>
  const sessionId = useChatStore((state) => state.sessionId)
  const sessionTitle = useChatStore((state) => state.sessionTitle)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const searchKey = JSON.stringify(search ?? {})
  const entryKey = [pathname, searchKey, sessionId ?? "", sessionTitle, workspaceId ?? "", workspaceName].join("\0")
  const entry = useMemo(() => {
    return materializeEntry(deriveHistoryEntry({
      pathname,
      search: (search ?? {}) as Record<string, unknown>,
      sessionId,
      sessionTitle,
      workspaceId,
      workspaceName
    }), t)
  }, [entryKey, pathname, search, searchKey, sessionId, sessionTitle, t, workspaceId, workspaceName])

  useEffect(() => {
    syncObservedEntry(entry)
  }, [entry])
}
