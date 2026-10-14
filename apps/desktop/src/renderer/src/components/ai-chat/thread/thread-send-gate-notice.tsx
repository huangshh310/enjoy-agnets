/**
 * 发送闸白卡。点同尺寸同位，只换色：中性灰 / 琥珀警告 / 红只给密钥无效。
 */
import type { ReactNode } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { APP_REGION_NO_DRAG_CLASS } from "@renderer/lib/app-region"
import { cx } from "@/utils/cx"

export type SendGateNoticeTone = "neutral" | "warning" | "danger"

function noticeDotClass(tone: SendGateNoticeTone): string {
  if (tone === "danger") return "bg-text-error-primary"
  if (tone === "warning") return "bg-status-yellow-text"
  return "bg-text-tertiary"
}

export function ThreadSendGateNotice({
  testId,
  kind,
  tone = "neutral",
  message,
  actionLabel,
  actionIcon,
  actionDisabled = false,
  onAction,
  secondaryActionLabel,
  secondaryActionIcon,
  secondaryActionDisabled = false,
  onSecondaryAction,
  onDismiss,
  className
}: {
  testId: string
  kind?: string
  tone?: SendGateNoticeTone
  message: string
  actionLabel: string
  actionIcon: ReactNode
  actionDisabled?: boolean
  onAction: () => void
  secondaryActionLabel?: string
  secondaryActionIcon?: ReactNode
  secondaryActionDisabled?: boolean
  onSecondaryAction?: () => void
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  return (
    <div
      id="thread-error-banner"
      data-testid={testId}
      data-kind={kind}
      data-tone={tone}
      className={cx(
        "my-2 flex w-full max-w-[40rem] items-start gap-2 rounded-xl border border-border-button-default",
        "bg-background-primary-default p-3 shadow-card",
        className
      )}
    >
      <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", noticeDotClass(tone))} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <NoticeAction
            testId={`${testId}-action`}
            label={actionLabel}
            icon={actionIcon}
            disabled={actionDisabled}
            variant="primary"
            onClick={onAction}
          />
          {secondaryActionLabel && onSecondaryAction ? (
            <NoticeAction
              testId={`${testId}-retry`}
              label={secondaryActionLabel}
              icon={secondaryActionIcon}
              disabled={secondaryActionDisabled}
              variant="secondary"
              onClick={onSecondaryAction}
            />
          ) : null}
        </div>
      </div>
      <button
        type="button"
        data-testid={`${testId}-dismiss`}
        data-app-region="no-drag"
        onClick={onDismiss}
        title={t("chat.dismissError")}
        className={cx(
          "cursor-pointer text-text-tertiary hover:text-text-primary",
          APP_REGION_NO_DRAG_CLASS
        )}
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  )
}

function NoticeAction({
  testId,
  label,
  icon,
  disabled,
  variant,
  onClick
}: {
  testId: string
  label: string
  icon?: ReactNode
  disabled: boolean
  variant: "primary" | "secondary"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-caption-2-medium font-semibold disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-accent-500 text-text-white"
          : "border border-border-button-default bg-background-primary-default text-text-primary"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
