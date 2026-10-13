/**
 * 审批卡片共用铬：分类图标、标题、HMAC。按钮见 approval-actions。
 * 禁止画 AICSS 的 plan 倒计时；HMAC 与 allow_session 是本产品契约。
 */
import type { ReactNode } from "react"
import { RiListCheck3, RiLock2Line, RiQuestionAnswerLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
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
  sessionHint?: string
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
  sessionHint,
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
        "flex flex-col gap-1.5 overflow-hidden rounded-2xl border bg-background-primary-default p-2 shadow-card [@media(max-height:600px)]:gap-0.5 [@media(max-height:600px)]:p-1",
        // 一套高度规则（#144 + #146）：命令区优先——command 卡整张不压（命令区自带 4 行 / 小窗 2 行 / 展开 40cqh 的上限）；
        // 其余卡（计划概览、提问、桌面）限高 min(45vh,22rem)，正文在卡内滚、先让位，标题行与底栏常驻。
        variant === "command"
          ? "shrink-0"
          : "max-h-[min(45vh,22rem)] min-h-20 [@media(max-height:600px)]:min-h-16",
        tone === "danger"
          ? "border-border-error-default/40"
          : tone === "warn"
            ? "border-chart-warning/40"
            : "border-separator-border/80"
      )}
    >
      {/* 正文区可压缩、区内滚；底栏 shrink-0，拒绝 / 运行永远可见（luna #144）。
          小窗（高 ≤ 600px）：图标 / 标题让位，标题挪到底栏一行；命令区不压缩。 */}
      <div className="flex min-h-6 shrink items-start gap-2 overflow-hidden">
        <span
          className={cx(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md [@media(max-height:600px)]:hidden",
            tone === "danger"
              ? "bg-background-tertiary-error text-text-error-primary"
              : tone === "warn"
                ? "bg-chart-warning/15 text-chart-warning-text"
                : ICON_TONE[variant]
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <div
          data-testid="approval-card-body"
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 self-stretch overflow-y-auto overscroll-contain [@media(max-height:600px)]:gap-0.5"
        >
          <h3 className="shrink-0 truncate text-caption-1-semibold leading-6 text-text-primary [@media(max-height:600px)]:hidden">
            {title}
          </h3>
          {children}
          {sessionHint ? (
            <p className="text-caption-2-regular text-text-tertiary [@media(max-height:600px)]:truncate [@media(max-height:440px)]:hidden">
              {sessionHint}
            </p>
          ) : null}
        </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-0.5 [@media(max-height:600px)]:pt-0">
        <h3
          data-testid="approval-compact-title"
          className={cx(
            "hidden min-w-0 truncate text-caption-1-semibold text-text-primary [@media(max-height:600px)]:block",
            // 有「本会话总是允许」时标题独占一行（luna #149：计划概览别跟三钮挤一行）；否则与两钮同行省高度。
            // 极矮窗（≤440）三钮优先：独占行的标题让位，标题仍在按钮 title 与卡正文里。
            showAlways && footer === "buttons" ? "basis-full [@media(max-height:440px)]:!hidden" : "max-w-[45%] shrink-0"
          )}
        >
          {title}
        </h3>
        <p className="inline-flex min-w-0 flex-1 basis-40 items-center gap-1.5 text-caption-2-regular text-text-tertiary [@media(max-height:600px)]:hidden">
          <RiLock2Line className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {t(isDevCopyEnabled() ? "chat.hmacBoundNotice" : "chat.approvalConfirmNotice")}
          </span>
        </p>
        <ApprovalActions
          variant={variant}
          approveLabel={approveLabel}
          denyLabel={denyLabel}
          alwaysLabel={alwaysLabel}
          alwaysHint={sessionHint}
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
