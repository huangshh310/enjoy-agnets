/**
 * L1：Stage 顶跨会话发现条。无项则整条 null，禁常驻灰条。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import {
  hasLiveComplete,
  isStripCompact,
  stripNeedsCount,
  stripVisibleItems
} from "@renderer/stores/attention/ingest-attention"
import { useChatStore } from "@renderer/stores/chat-store"
import { matchAppModule } from "@renderer/components/app-shell/routing/match-module"
import { AttentionChip } from "./attention-chip"
import { focusAttention } from "./focus-attention"

export function AttentionStrip() {
  const t = useT()
  const navigate = useNavigate()
  const isChat = useRouterState({
    select: (state) => matchAppModule(state.location.pathname) === "chat"
  })
  const sessionId = useChatStore((state) => state.sessionId)
  const dockOpen = useChatStore((state) => Boolean(state.pendingApproval))
  const items = useAttentionStore((state) => state.items)
  const [now, setNow] = useState(() => Date.now())
  const visible = useMemo(() => stripVisibleItems(items), [items])
  const needs = stripNeedsCount(items)

  useEffect(() => {
    if (visible.length === 0 && !hasLiveComplete(items)) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      useAttentionStore.getState().expireStale()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [items, visible.length])

  if (visible.length === 0) return null

  return (
    <div
      role="region"
      aria-label={t("attention.stripLabel")}
      className="flex min-w-0 shrink-0 items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {needs > 0 ? (
        <span className="shrink-0 text-caption-2-medium text-text-secondary">
          {t("attention.stripCount", { n: needs })}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        {visible.map((item) => (
          <AttentionChip
            key={item.id}
            item={item}
            now={now}
            compact={isStripCompact(item, sessionId, isChat, dockOpen)}
            onOpen={(target) => {
              void focusAttention({
                sessionId: target.sessionId,
                workspaceId: target.workspaceId,
                kind: target.kind,
                navigate
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}
