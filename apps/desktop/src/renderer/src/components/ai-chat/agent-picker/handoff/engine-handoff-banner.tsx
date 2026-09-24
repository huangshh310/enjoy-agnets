/**
 * 已交接短提示：贴在输入框上沿，数秒后自己消失。不占一横条，不写摘要。
 */
import { useEffect } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { useEngineHandoffStore } from "./engine-handoff-store"

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
  const visible = Boolean(banner && banner.sessionId === sessionId)

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(dismissBanner, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [visible, banner?.fromRuntimeId, banner?.toRuntimeId, dismissBanner])

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
