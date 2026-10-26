/**
 * 已交接短提示：贴在输入框上沿，数秒后自己消失。不占一横条，不写摘要。
 * 这个会话还有排队项时不画（handoffBannerVisible）：浮层会盖住紧挨输入框的排队区（mike P3）。
 */
import { useEffect, useState } from "react"
import { listFollowups, subscribeFollowups } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { useEngineHandoffStore } from "./engine-handoff-store"
import { handoffBannerVisible } from "./handoff-labels"

const TOAST_MS = 3200

export function EngineHandoffBanner({
  fromLabel,
  toLabel
}: {
  fromLabel: string
  toLabel: string
}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const banner = useEngineHandoffStore((state) => state.banner)
  const dismissBanner = useEngineHandoffStore((state) => state.dismissBanner)
  const queuedCount = useQueuedCount(sessionId)
  const forThisSession = Boolean(banner && banner.sessionId === sessionId)
  const visible = handoffBannerVisible({ bannerForThisSession: forThisSession, queuedCount })

  // 计时按「这条提示属于本会话」走，不按画没画：排队区让位时也照常过期，排队清空后不会冒出一条过时的「已交接」。
  useEffect(() => {
    if (!forThisSession) return
    const timer = window.setTimeout(dismissBanner, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [forThisSession, banner?.fromRuntimeId, banner?.toRuntimeId, dismissBanner])

  if (!visible) return null

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-full left-6 z-20 mb-2 inline-flex max-w-[min(24rem,calc(100%-3rem))] items-center rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium text-text-secondary shadow-card"
    >
      <span className="truncate">{t("chat.handoff.banner", { from: fromLabel, to: toLabel })}</span>
    </div>
  )
}

function useQueuedCount(sessionId: string | null): number {
  const [count, setCount] = useState(() => listFollowups(sessionId).length)
  useEffect(() => {
    const sync = () => setCount(listFollowups(sessionId).length)
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])
  return count
}
