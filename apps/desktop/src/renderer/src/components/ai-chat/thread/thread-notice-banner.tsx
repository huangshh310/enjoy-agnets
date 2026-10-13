/**
 * 非失败提示：用户停 / 回挂对不上 / ACP resume 回落。中性小卡，不是错误卡。
 * 挂在消息流里那一轮「重启后已中断」行下面（AiChatThread 定锚），不浮在 Composer 上，
 * 不与 Composer 上方的待验收条争位置。
 * no_chat_route 由 ThreadErrorBanner → ThreadNoChatRouteNotice 画，这里不再叠一条。
 */
import { RiCloseLine, RiRefreshLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { focusComposerEndAfterPaint } from "@renderer/hooks/composer-focus"
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
  const restoreInterrupted = kind === "restore_interrupted"
  const restoreFamily = restoreMismatch || restoreInterrupted
  const catchUpTimeout = kind === "catch_up_timeout"
  const resume = kind === "resume_fallback"
  const title = restoreFamily
    ? t("chat.restartAbandoned")
    : stopped
      ? t("chat.runStopped")
      : catchUpTimeout
        ? t("studio.automations.catchUpTimeout")
        : resume
          ? t("chat.acpResumeFallbackTitle")
          : notice
  const detail = restoreInterrupted
    ? t("chat.restoreInterrupted")
    : restoreMismatch
      ? t("chat.restoreNoMatching")
      : resume
        ? t("chat.acpResumeFallbackHint")
        : undefined

  function handleResend() {
    const lastUser = [...messages].reverse().find((row) => row.role === "user")
    if (lastUser?.content) useChatStore.getState().setComposer(lastUser.content)
    setNotice(null)
    focusComposerEndAfterPaint()
  }

  return (
    <div
      data-testid="thread-notice-banner"
      className="mt-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2.5 [@media(max-height:640px)]:mt-0 [@media(max-height:640px)]:py-1"
    >
      <span
        className={cx(
          "mt-1 size-2 shrink-0 rounded-full",
          stopped || restoreFamily || catchUpTimeout ? "bg-text-tertiary" : "bg-status-yellow-text"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{title}</p>
        {detail ? <p className="mt-0.5 text-caption-2-regular text-text-secondary">{detail}</p> : null}
        {restoreFamily ? (
          <button
            type="button"
            data-testid="thread-resend"
            onClick={handleResend}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg [@media(max-height:640px)]:mt-1 [@media(max-height:640px)]:py-0.5 border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-2-medium font-semibold text-text-primary hover:border-accent-500/40 hover:bg-background-secondary-hover"
          >
            <RiRefreshLine className="size-3 text-accent-500" />
            <span>{t("chat.resendLastPrompt")}</span>
          </button>
        ) : null}
      </div>
      <button
        type="button"
        data-testid="thread-notice-dismiss"
        onClick={() => setNotice(null)}
        title={t("chat.dismissError")}
        aria-label={t("chat.dismissError")}
        className="cursor-pointer text-text-tertiary hover:text-text-primary"
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  )
}
