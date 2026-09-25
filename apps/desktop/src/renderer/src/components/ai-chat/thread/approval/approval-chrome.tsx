/**
 * 审批卡片共用铬：分类图标、标题、HMAC。按钮见 approval-actions。
 * 禁止画 AICSS 的 plan 倒计时；HMAC 与 allow_session 是本产品契约。
 */
import type { ReactNode } from "react"
import { RiListCheck3, RiLock2Line, RiQuestionAnswerLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ApprovalActions } from "./approval-actions"
import type { ApprovalActionIds, ApprovalDecide, ApprovalFooter, ApprovalTone, ApprovalVariant } from "./approval.types"

const ICON = {
  command: RiTerminalBoxLine,
  plan: RiListCheck3,
  questions: RiQuestionAnswerLine,
  desktop: RiQuestionAnswerLine
} as const

const ICON_TONE = {
  command: "border-border-error-default/30 bg-background-tertiary-error text-text-error-primary",
  plan: "border-state-success-text/20 bg-state-success-base/40 text-state-success-text",
  questions: "border-accent-500/20 bg-accent-500/10 text-accent-500",
  desktop: "border-accent-500/20 bg-accent-500/10 text-accent-500"
} as const

type ApprovalChromeProps = ApprovalActionIds & {
  variant: ApprovalVariant
  title: string
  children: ReactNode
  approveLabel: string
  denyLabel: string
  alwaysLabel?: string
  showAlways?: boolean
  footer?: ApprovalFooter
  approveDisabled?: boolean
  approveTitle?: string
  tone?: ApprovalTone
  decide: ApprovalDecide
}

export function ApprovalChrome({
  variant,
  title,
  children,
  approveLabel,
  denyLabel,
  alwaysLabel,
  showAlways = true,
  footer = "buttons",
  approveDisabled,
  approveTitle,
  tone,
  denyTestId,
  allowTestId,
  decide
}: ApprovalChromeProps) {
  const t = useT()
  const Icon = ICON[variant]
  return (
    <article
      data-variant={variant}
      data-tone={tone}
      className={cx(
        "flex flex-col gap-3 overflow-hidden rounded-2xl border bg-background-primary-default p-3 shadow-card",
        tone === "danger"
          ? "border-border-error-default/40"
          : tone === "warn"
            ? "border-chart-warning/40"
            : "border-separator-border/80"
      )}
    >
      <header className="flex items-center gap-2">
        <span
          className={cx(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            tone === "danger"
              ? "bg-background-tertiary-error text-text-error-primary"
              : tone === "warn"
                ? "bg-chart-warning/15 text-chart-warning-text"
                : ICON_TONE[variant]
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 text-caption-1-semibold text-text-primary">{title}</h3>
      </header>
      {children}
      <footer className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-caption-2-regular text-text-tertiary">
          <RiLock2Line className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t("chat.hmacBoundNotice")}</span>
        </p>
        <ApprovalActions
          variant={variant}
          approveLabel={approveLabel}
          denyLabel={denyLabel}
          alwaysLabel={alwaysLabel}
          showAlways={showAlways}
          footer={footer}
          approveDisabled={approveDisabled}
          approveTitle={approveTitle}
          denyTestId={denyTestId}
          allowTestId={allowTestId}
          decide={decide}
        />
      </footer>
    </article>
  )
}
