/**
 * 发送闸中性提示：连模型才能发。luna 会定稿文案。
 */
import { RiCloseLine, RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function ThreadNoChatRouteNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div
      id="thread-error-banner"
      data-testid="thread-no-chat-route-notice"
      className={cx(
        "my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default",
        "bg-background-primary-default p-3 shadow-card",
        className
      )}
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-status-yellow-text" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{t("chat.noChatRouteNotice")}</p>
        <button
          type="button"
          onClick={() => {
            onDismiss()
            void navigate({ to: "/settings/$section", params: { section: "providers" } })
          }}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
        >
          <RiKey2Line className="size-3" />
          <span>{t("chat.goConnect")}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        title={t("chat.dismissError")}
        className="cursor-pointer text-text-tertiary hover:text-text-primary"
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  )
}
