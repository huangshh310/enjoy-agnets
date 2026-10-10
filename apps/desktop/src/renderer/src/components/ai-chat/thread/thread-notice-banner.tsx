/**
 * 非失败提示：用户停 / 回挂对不上 / ACP resume 回落。中性条，不是错误卡。
 * no_chat_route 由 ThreadErrorBanner → ThreadNoChatRouteNotice 画，这里不再叠一条。
 */
import { RiCloseLine, RiRefreshLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { cx } from "@/utils/cx"

export function ThreadNoticeBanner() {
  const t = useT()
  const notice = useChatStore((state) => state.notice)
  const setNotice = useChatStore((state) => state.setNotice)
  const messages = useChatStore((state) => state.messages)
  if (!notice) return null
  const kind = classifyThreadError(notice)
  const stopped = kind === "stopped"
  const restoreMismatch = kind === "restore_no_matching"
  const catchUpTimeout = kind === "catch_up_timeout"
  const resume = kind === "resume_fallback"
  const title = restoreMismatch
    ? t("chat.restartAbandoned")
    : stopped
      ? t("chat.runStopped")
      : catchUpTimeout
        ? t("studio.automations.catchUpTimeout")
        : resume
          ? t("chat.acpResumeFallbackTitle")
          : notice
  const detail = restoreMismatch
    ? t("chat.restoreNoMatching")
    : resume
      ? t("chat.acpResumeFallbackHint")
      : undefined

  function handleResend() {
    const lastUser = [...messages].reverse().find((row) => row.role === "user")
    if (lastUser?.content) useChatStore.getState().setComposer(lastUser.content)
    setNotice(null)
  }

  return (
    <div
      data-testid="thread-notice-banner"
      className="my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <span
        className={cx(
          "mt-1.5 size-2 shrink-0 rounded-full",
          stopped || restoreMismatch || catchUpTimeout ? "bg-text-tertiary" : "bg-status-yellow-text"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{title}</p>
        {detail ? <p className="mt-0.5 text-caption-2-regular text-text-secondary">{detail}</p> : null}
        {restoreMismatch ? (
          <button
            type="button"
            data-testid="thread-resend"
            onClick={handleResend}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary shadow-2xs hover:border-accent-500/40 hover:bg-background-secondary-hover"
          >
            <RiRefreshLine className="size-3 text-accent-500" />
            <span>{t("chat.resendLastPrompt")}</span>
          </button>
        ) : null}
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
