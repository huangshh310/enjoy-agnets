/**
 * 发送闸中性条：还差一步 / 先选模型。红色只留给真错误。
 */
import type { ReactNode } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function ThreadSendGateNotice({
  testId,
  kind,
  message,
  actionLabel,
  actionIcon,
  onAction,
  onDismiss,
  className,
  tone = "neutral"
}: {
  testId: string
  kind?: string
  message: string
  actionLabel: string
  actionIcon: ReactNode
  onAction: () => void
  onDismiss: () => void
  className?: string
  tone?: "neutral" | "error"
}) {
  const t = useT()
  const error = tone === "error"
  return (
    <div
      id="thread-error-banner"
      data-testid={testId}
      data-kind={kind}
      className={cx(
        "my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border p-3 shadow-card",
        error
          ? "border-border-error-default bg-background-tertiary-error"
          : "border-border-button-default bg-background-primary-default",
        className
      )}
    >
      <span
        className={cx(
          "mt-1.5 size-2 shrink-0 rounded-full",
          error ? "bg-text-error-primary" : "bg-status-yellow-text"
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{message}</p>
        <button
          type="button"
          data-testid={`${testId}-action`}
          onClick={onAction}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500 px-2.5 py-1 text-caption-2-medium font-semibold text-text-white"
        >
          {actionIcon}
          <span>{actionLabel}</span>
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
