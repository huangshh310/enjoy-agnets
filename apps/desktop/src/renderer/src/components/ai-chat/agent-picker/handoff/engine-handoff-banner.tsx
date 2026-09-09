/**
 * 已交接微条：只写 from→to，可 dismiss。不展示摘要正文。
 */
import { RiCloseLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { useEngineHandoffStore } from "./engine-handoff-store"

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

  if (!banner || banner.sessionId !== sessionId) return null

  return (
    <div
      className="flex w-full items-center gap-2 rounded-full border border-border-button-default bg-background-secondary-default px-3 py-1.5 shadow-2xs"
      role="status"
    >
      <span className="min-w-0 flex-1 truncate text-caption-2-medium text-text-secondary">
        {t("chat.handoff.banner", { from: fromLabel, to: toLabel })}
      </span>
      <button
        type="button"
        onClick={dismissBanner}
        aria-label={t("chat.handoff.dismiss")}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none hover:bg-background-tertiary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiCloseLine className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
