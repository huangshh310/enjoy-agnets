/**
 * L1：Stage 顶跨会话发现条（浮动微胶囊，不占位，支持忽略关闭）。
 * 无项则整条 null，禁常驻灰条。
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { RiCloseLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
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

  const handleDismissAll = () => {
    for (const item of visible) {
      useAttentionStore.getState().dismiss(item.id)
    }
  }

  const handleDismissOne = (id: string) => {
    useAttentionStore.getState().dismiss(id)
  }

  return (
    <div className="pointer-events-none absolute top-3 inset-x-0 z-30 flex justify-center px-4">
      <div
        role="region"
        aria-label={t("attention.stripLabel")}
        className={cx(
          "pointer-events-auto relative flex h-9 max-w-2xl items-center gap-2 rounded-full",
          "border border-border-button-default/80 bg-background-primary-default/95 px-3 py-1 shadow-card backdrop-blur-md",
          "animate-in fade-in-50 slide-in-from-top-2 duration-200"
        )}
      >
        {needs > 0 ? (
          <span className="flex shrink-0 items-center gap-1.5 text-caption-2-medium text-text-secondary">
            <span className="size-1.5 rounded-full bg-status-yellow-text animate-pulse" />
            {t("attention.stripCount", { n: needs })}
          </span>
        ) : null}
        {needs > 0 ? <span className="h-3.5 w-px shrink-0 bg-separator-border" /> : null}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              onDismiss={(target) => {
                handleDismissOne(target.id)
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleDismissAll}
          title={t("attention.dismiss")}
          aria-label={t("attention.dismiss")}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-primary"
        >
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
