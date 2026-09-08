/**
 * L1：跨会话发现条。无 active 则整条不渲染。
 */
import { useMemo } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { stripVisibleItems } from "@renderer/stores/attention/ingest-attention"
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
  const items = useAttentionStore((state) => state.items)
  const visible = useMemo(
    () => stripVisibleItems(items, sessionId, isChat),
    [isChat, items, sessionId]
  )

  if (visible.length === 0) return null

  return (
    <div
      role="region"
      aria-label={t("attention.stripLabel")}
      className="flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span className="shrink-0 text-caption-2-medium text-text-tertiary">
        {t("attention.stripLabel")}
      </span>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        {visible.map((item) => (
          <AttentionChip
            key={item.id}
            item={item}
            onOpen={(target) => {
              void focusAttention({
                sessionId: target.sessionId,
                kind: target.kind,
                navigate
              })
            }}
            onDismiss={(id) => useAttentionStore.getState().dismiss(id)}
          />
        ))}
      </div>
    </div>
  )
}
