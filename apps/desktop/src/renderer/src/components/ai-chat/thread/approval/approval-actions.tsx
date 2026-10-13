/**
 * 审批底栏：顺序锁死「本会话总是允许 · 拒绝 · 运行」；宽时一行，窄卡整颗换行不截断（luna #151）。
 * 桌面首次允许改四选一，底栏只留「继续」。会话钮 testid 是 approval-session。禁止再用 approval-always。
 */
import { RiCheckLine, RiCloseLine, RiShieldCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ApprovalActionIds, ApprovalDecide, ApprovalFooter, ApprovalVariant } from "./approval.types"

type ApprovalActionsProps = ApprovalActionIds & {
  variant: ApprovalVariant
  approveLabel: string
  denyLabel: string
  alwaysLabel?: string
  alwaysHint?: string
  showAlways: boolean
  footer?: ApprovalFooter
  approveDisabled?: boolean
  approveTitle?: string
  decide: ApprovalDecide
}

export function ApprovalActions({
  variant,
  approveLabel,
  denyLabel,
  alwaysLabel,
  alwaysHint,
  showAlways,
  footer = "buttons",
  approveDisabled,
  approveTitle,
  denyTestId = "approval-deny",
  allowTestId = "approval-allow",
  decide
}: ApprovalActionsProps) {
  const t = useT()
  if (footer === "continue") {
    return (
      <div className="ml-auto flex items-center justify-end">
        <Button
          size="sm"
          variant="default"
          data-testid="approval-continue"
          disabled={approveDisabled}
          title={approveTitle}
          onClick={decide.onApprove}
          className="h-8 text-caption-1-semibold"
        >
          <RiCheckLine className="size-3.5" />
          {approveLabel}
        </Button>
      </div>
    )
  }
  const denyTone =
    variant === "questions" || variant === "desktop" ? "" : "text-text-error-primary hover:bg-text-error-primary/10"
  return (
    // 顺序锁死「本会话总是允许 · 拒绝 · 运行」。卡宽放得下就一行；放不下（英文 440×480）整颗换行，
    // 全称完整露出、不截断丢范围词；拒绝 / 运行整组 shrink-0 永远在卡内（luna / leo #151）。
    <div
      data-testid="approval-actions"
      className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1 whitespace-nowrap"
    >
      {showAlways ? (
        <Button
          size="sm"
          variant="outline"
          data-testid="approval-session"
          onClick={decide.onAllowSession}
          title={`${alwaysLabel ?? t("chat.alwaysAllow")} · ${alwaysHint ?? t("chat.alwaysAllowHint")}`}
          aria-label={alwaysLabel ?? t("chat.alwaysAllow")}
          className="h-7 shrink-0 gap-1 px-2 text-caption-1-medium has-[>svg]:px-2"
        >
          <RiShieldCheckLine className="size-3.5 shrink-0 text-accent-500" />
          <span data-testid="approval-session-label">{alwaysLabel ?? t("chat.alwaysAllow")}</span>
        </Button>
      ) : null}
      <div data-testid="approval-primary-actions" className="flex shrink-0 flex-nowrap items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          data-testid={denyTestId}
          onClick={decide.onDeny}
          className={cx("h-7 gap-1 px-2 text-caption-1-medium has-[>svg]:px-2", denyTone)}
        >
          <RiCloseLine className="size-3.5" />
          {denyLabel}
        </Button>
        <Button
          size="sm"
          variant="default"
          data-testid={allowTestId}
          disabled={approveDisabled}
          title={approveTitle}
          onClick={decide.onApprove}
          className="h-7 gap-1 px-2.5 text-caption-1-semibold has-[>svg]:px-2.5"
        >
          <RiCheckLine className="size-3.5" />
          {approveLabel}
        </Button>
      </div>
    </div>
  )
}
