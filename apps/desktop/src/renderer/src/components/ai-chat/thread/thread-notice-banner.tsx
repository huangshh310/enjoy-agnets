/**
 * 非失败提示：ACP resume 回落。描边 line，不是红错误卡。
 * no_chat_route 由 ThreadErrorBanner → ThreadNoChatRouteNotice 画，这里不再叠一条。
 */
import { RiCloseLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"

export function ThreadNoticeBanner() {
  const t = useT()
  const notice = useChatStore((state) => state.notice)
  const setNotice = useChatStore((state) => state.setNotice)
  if (!notice) return null
  const resume = classifyThreadError(notice) === "resume_fallback"
  const title = resume ? t("chat.acpResumeFallbackTitle") : notice
  const detail = resume ? t("chat.acpResumeFallbackHint") : undefined

  return (
    <div
      data-testid="thread-notice-banner"
      className="my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-status-yellow-text" aria-hidden />
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
