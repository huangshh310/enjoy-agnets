/**
 * 审批底栏按钮：拒绝 / 本会话允许 / 主操作。
 */
import { RiCheckLine, RiCloseLine, RiShieldCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ApprovalDecide, ApprovalVariant } from "./approval.types"

export function ApprovalActions({
  variant,
  approveLabel,
  denyLabel,
  showAlways,
  approveDisabled,
  decide
}: {
  variant: ApprovalVariant
  approveLabel: string
  denyLabel: string
  showAlways: boolean
  approveDisabled?: boolean
  decide: ApprovalDecide
}) {
  const t = useT()
  const denyTone =
    variant === "questions" ? "" : "text-text-error-primary hover:bg-text-error-primary/10"
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
      <Button size="sm" variant="ghost" onClick={decide.onDeny} className={cx("h-8 text-caption-1-medium", denyTone)}>
        <RiCloseLine className="size-3.5" />
        {denyLabel}
      </Button>
      {showAlways ? (
        <Button
          size="sm"
          variant="outline"
          onClick={decide.onAllowSession}
          title={t("chat.alwaysAllowHint")}
          className="h-8 text-caption-1-medium"
        >
          <RiShieldCheckLine className="size-3.5 text-accent-500" />
          {t("chat.alwaysAllow")}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="default"
        disabled={approveDisabled}
        onClick={decide.onApprove}
        className="h-8 text-caption-1-semibold"
      >
        <RiCheckLine className="size-3.5" />
        {approveLabel}
      </Button>
    </div>
  )
}
