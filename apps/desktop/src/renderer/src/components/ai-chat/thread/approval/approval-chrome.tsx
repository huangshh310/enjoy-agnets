/**
 * 审批卡片共用铬：分类图标、标题、HMAC。按钮见 approval-actions。
 * 禁止画 AICSS 的 plan 倒计时；HMAC 与 allow_session 是本产品契约。
 */
import type { ReactNode } from "react"
import { RiListCheck3, RiLock2Line, RiQuestionAnswerLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ApprovalActions } from "./approval-actions"
import type { ApprovalDecide, ApprovalVariant } from "./approval.types"

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

export function ApprovalChrome({
  variant,
  title,
  children,
  approveLabel,
  denyLabel,
  showAlways = true,
  approveDisabled,
  decide
}: {
  variant: ApprovalVariant
  title: string
  children: ReactNode
  approveLabel: string
  denyLabel: string
  showAlways?: boolean
  approveDisabled?: boolean
  decide: ApprovalDecide
}) {
  const t = useT()
  const Icon = ICON[variant]
  return (
    <article
      data-variant={variant}
      className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-3 shadow-card"
    >
      <header className="flex items-center gap-2">
        <span className={cx("inline-flex size-6 shrink-0 items-center justify-center rounded-md", ICON_TONE[variant])}>
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
          showAlways={showAlways}
          approveDisabled={approveDisabled}
          decide={decide}
        />
      </footer>
    </article>
  )
}
