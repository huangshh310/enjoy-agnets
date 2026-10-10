/**
 * 审批底栏：command/plan 仍是拒绝 / 本会话 / 主操作。
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
    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        data-testid={denyTestId}
        onClick={decide.onDeny}
        className={cx("h-8 text-caption-1-medium", denyTone)}
      >
        <RiCloseLine className="size-3.5" />
        {denyLabel}
      </Button>
      {showAlways ? (
        <Button
          size="sm"
          variant="outline"
          data-testid="approval-session"
          onClick={decide.onAllowSession}
          title={alwaysHint ?? t("chat.alwaysAllowHint")}
          className="h-8 text-caption-1-medium"
        >
          <RiShieldCheckLine className="size-3.5 text-accent-500" />
          {alwaysLabel ?? t("chat.alwaysAllow")}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="default"
        data-testid={allowTestId}
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
