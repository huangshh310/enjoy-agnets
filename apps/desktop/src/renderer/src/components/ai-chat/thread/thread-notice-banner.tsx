/**
 * 非失败提示：无对话路线、ACP resume 回落。描边 line，不是红错误卡。
 */
import { RiCloseLine, RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { officialProviderSearch } from "@renderer/components/setup-guide/open-provider-form"

export function ThreadNoticeBanner() {
  const t = useT()
  const navigate = useNavigate()
  const error = useChatStore((state) => state.error)
  const notice = useChatStore((state) => state.notice)
  const setError = useChatStore((state) => state.setError)
  const setNotice = useChatStore((state) => state.setNotice)
  const noRoute = error != null && classifyThreadError(error) === "no_chat_route"
  if (noRoute) {
    return (
      <div
        data-testid="thread-notice-banner"
        data-kind="no_chat_route"
        className="my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
      >
        <div className="min-w-0 flex-1">
          <p className="text-caption-1-medium text-text-primary">{t("chat.noChatRouteNotice")}</p>
          <button
            type="button"
            data-testid="no-chat-route-connect"
            onClick={() => {
              void navigate({
                to: "/settings/$section",
                params: { section: "providers" },
                search: officialProviderSearch()
              })
            }}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-caption-2-medium text-accent-600 hover:underline"
          >
            <RiKey2Line className="size-3.5" aria-hidden />
            {t("chat.goConnect")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setError(null)}
          title={t("chat.dismissError")}
          className="cursor-pointer text-text-tertiary hover:text-text-primary"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>
    )
  }
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
