/**
 * AutoApproveBar 一瞥文案：写入 / Shell / Git 是否需确认。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { ApprovalPrefFlags } from "./approval-policy"

export function approvalGlanceParts(flags: ApprovalPrefFlags, t: TranslateFn): string[] {
  return [
    flags.requireWriteApproval ? t("attention.glance.writeNeed") : t("attention.glance.writeAuto"),
    flags.requireBashApproval ? t("attention.glance.shellNeed") : t("attention.glance.shellAuto"),
    flags.requireCommitApproval ? t("attention.glance.gitNeed") : t("attention.glance.gitAuto")
  ]
}

export function approvalGlanceLabel(flags: ApprovalPrefFlags, t: TranslateFn): string {
  return approvalGlanceParts(flags, t).join(" · ")
}
