/**
 * Attention 条共享状态：可见项、需处理数、过期计时。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import {
  hasLiveComplete,
  isStripCompact,
  stripNeedsCount,
  stripVisibleForOpenSessions
} from "@renderer/stores/attention/ingest-attention"
import { useChatStore } from "@renderer/stores/chat-store"
import { matchAppModule } from "@renderer/components/app-shell/routing/match-module"
import { focusAttention } from "./focus-attention"
import type { AttentionItem } from "@renderer/stores/attention/attention.types"

export function useAttentionStrip() {
  const navigate = useNavigate()
  const isChat = useRouterState({
    select: (state) => matchAppModule(state.location.pathname) === "chat"
  })
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const dockOpen = useChatStore((state) => Boolean(state.pendingApproval))
  const items = useAttentionStore((state) => state.items)
  const [now, setNow] = useState(() => Date.now())
  const visible = useMemo(() => {
    const openSessionIds = new Set(
      repositories.filter((node) => node.kind === "session").map((node) => node.id)
    )
    return stripVisibleForOpenSessions(items, openSessionIds)
  }, [items, repositories])
  const needsItems = visible.filter((item) => item.kind !== "complete")
  const completeItems = visible.filter((item) => item.kind === "complete")
  const needs = stripNeedsCount(items)

  useEffect(() => {
    if (visible.length === 0 && !hasLiveComplete(items)) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      useAttentionStore.getState().expireStale()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [items, visible.length])

  const dismissAll = (targets: AttentionItem[]) => {
    for (const item of targets) useAttentionStore.getState().dismiss(item.id)
  }
  const dismissOne = (id: string) => {
    useAttentionStore.getState().dismiss(id)
  }
  const openItem = (target: AttentionItem) => {
    void focusAttention({
      sessionId: target.sessionId,
      workspaceId: target.workspaceId,
      kind: target.kind,
      navigate
    })
  }
  const compactFor = (item: AttentionItem) => isStripCompact(item, sessionId, isChat, dockOpen)

  return {
    needsItems,
    completeItems,
    needs,
    now,
    dismissAll,
    dismissOne,
    openItem,
    compactFor
  }
}
