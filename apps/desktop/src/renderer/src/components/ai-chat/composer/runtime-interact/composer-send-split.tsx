/**
 * Stop 与发送互斥：有草稿才出发送，空草稿运行中才出 Stop。
 */
import { RiArrowUpLine, RiStopLine } from "@remixicon/react"
import { composerActionSlot } from "@renderer/hooks/composer-submit-intent"
import { useT } from "@renderer/i18n"

export function ComposerSendSplit({
  running,
  hasDraft,
  ready = true,
  onSend,
  onStop
}: {
  running: boolean
  hasDraft: boolean
  ready?: boolean
  onSend: () => void
  onStop: () => void
}) {
  const t = useT()
  const slot = composerActionSlot(running, hasDraft)
  if (slot === "stop") {
    return (
      <button type="button" aria-label={t("chat.stop")} onClick={onStop} className={sendClassName}>
        <RiStopLine className="size-5" aria-hidden />
      </button>
    )
  }
  if (slot === "send") {
    return (
      <button
        type={running ? "button" : "submit"}
        aria-label={running ? t("chat.runtimeQueue") : ready ? t("chat.send") : t("chat.sendNotReady")}
        title={running ? t("chat.runtimeQueuedHint") : ready ? t("chat.send") : t("chat.sendNotReady")}
        onClick={running ? onSend : undefined}
        className={ready ? sendClassName : mutedSendClassName}
      >
        <RiArrowUpLine className="size-5" aria-hidden />
      </button>
    )
  }
  return null
}

const sendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-500 to-accent-600 text-text-white shadow-nav-selected transition-all hover:brightness-110 active:scale-95"

const mutedSendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-separator-border bg-background-secondary-default text-text-tertiary transition-all hover:text-text-primary"
