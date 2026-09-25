/**
 * 审批底栏按钮：拒绝 / 本会话允许 / 始终允许此应用 / 主操作。
 * 会话钮 testid 是 approval-session；始终允许是 approval-always-app。禁止再用 approval-always。
 */
import { RiCheckLine, RiCloseLine, RiShieldCheckLine, RiShieldKeyholeLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ApprovalActionIds, ApprovalDecide, ApprovalVariant } from "./approval.types"

type ApprovalActionsProps = ApprovalActionIds & {
  variant: ApprovalVariant
  approveLabel: string
  denyLabel: string
  alwaysLabel?: string
  alwaysAppLabel?: string
  showAlways: boolean
  showAlwaysApp?: boolean
  approveDisabled?: boolean
  approveTitle?: string
  decide: ApprovalDecide
}

export function ApprovalActions({
  variant,
  approveLabel,
  denyLabel,
  alwaysLabel,
  alwaysAppLabel,
  showAlways,
  showAlwaysApp = false,
  approveDisabled,
  approveTitle,
  denyTestId = "approval-deny",
  allowTestId = "approval-allow",
  decide
}: ApprovalActionsProps) {
  const t = useT()
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
          title={t("chat.alwaysAllowHint")}
          className="h-8 text-caption-1-medium"
        >
          <RiShieldCheckLine className="size-3.5 text-accent-500" />
          {alwaysLabel ?? t("chat.alwaysAllow")}
        </Button>
      ) : null}
      {showAlwaysApp ? (
        <Button
          size="sm"
          variant="outline"
          data-testid="approval-always-app"
          onClick={() => decide.onAllowAlways?.()}
          title={t("chat.desktopAllowAlwaysHint")}
          className="h-8 border-accent-500/40 bg-accent-500/5 text-caption-1-medium hover:bg-accent-500/10"
        >
          <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
          {alwaysAppLabel ?? t("chat.desktopAllowAlways")}
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
