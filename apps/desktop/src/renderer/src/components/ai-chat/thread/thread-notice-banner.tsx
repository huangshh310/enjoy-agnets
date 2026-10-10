/**
 * 非失败提示：用户停 / ACP resume 回落。中性条，不是错误卡。
 */
import { RiCloseLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { cx } from "@/utils/cx"

export function ThreadNoticeBanner() {
  const t = useT()
  const notice = useChatStore((state) => state.notice)
  const setNotice = useChatStore((state) => state.setNotice)
  if (!notice) return null
  const kind = classifyThreadError(notice)
  const stopped = kind === "stopped"
  const catchUpTimeout = kind === "catch_up_timeout"
  const resume = kind === "resume_fallback"
  const title = stopped
    ? t("chat.runStopped")
    : catchUpTimeout
      ? t("studio.automations.catchUpTimeout")
      : resume
        ? t("chat.acpResumeFallbackTitle")
        : notice
  const detail = resume ? t("chat.acpResumeFallbackHint") : undefined

  return (
    <div
      data-testid="thread-notice-banner"
      className="my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <span
        className={cx(
          "mt-1.5 size-2 shrink-0 rounded-full",
          stopped || catchUpTimeout ? "bg-text-tertiary" : "bg-status-yellow-text"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{title}</p>
        {detail ? <p className="mt-0.5 text-caption-2-regular text-text-secondary">{detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => setNotice(null)}
        title={t("chat.dismissError")}
        className="cursor-pointer text-text-tertiary hover:text-text-primary"
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  )
}
