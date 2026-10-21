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
      <button
        type="button"
        data-testid="composer-stop"
        aria-label={t("chat.stop")}
        onClick={onStop}
        className={sendClassName}
      >
        <RiStopLine className="size-5" aria-hidden />
      </button>
    )
  }
  if (slot === "send") {
    return (
      <button
        type={running ? "button" : "submit"}
        data-testid="composer-send"
        aria-label={running ? t("chat.runtimeQueue") : ready ? t("chat.send") : t("chat.sendNotReady")}
        title={running ? t("chat.runtimeQueuedHint") : ready ? t("chat.send") : t("chat.sendNotReady")}
        onClick={running ? onSend : undefined}
        className={ready ? sendClassName : mutedSendClassName}
      >
        <RiArrowUpLine className="size-5" aria-hidden />
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled
      data-testid="composer-send"
      aria-label={t("chat.send")}
      title={t("chat.send")}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default/80 text-foreground-icon-tertiary/40 transition-all cursor-not-allowed opacity-40 select-none"
    >
      <RiArrowUpLine className="size-5" aria-hidden />
    </button>
  )
}

/**
 * 亮色走主按钮 token（默认 accent-700 白图标，悬停 800；琥珀 ink 变体 500 墨色图标）。
 * 暗色输入框是深底，700 / 800 跟它几乎糊在一起（石墨灰 1.46），所以暗色换 500 底 + 近黑图标 on-accent-bright（图标 ≥ 3.8，按钮对输入框 ≥ 3）。
 * 不用 hover:brightness-110：白图标在 500 上琥珀只有 2.15。
 */
const sendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full bg-cta text-cta-foreground shadow-nav-selected transition-all hover:bg-cta-hover active:scale-95 dark:bg-accent-500 dark:text-on-accent-bright dark:hover:bg-accent-400"

const mutedSendClassName =
  "flex size-8 shrink-0 items-center justify-center rounded-full border border-separator-border bg-background-secondary-default text-text-tertiary transition-all hover:text-text-primary"
