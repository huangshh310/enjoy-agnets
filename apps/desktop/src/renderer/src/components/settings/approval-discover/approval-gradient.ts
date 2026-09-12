/**
 * 本机审批梯度：全确认 / 部分放行 / 自动批准。
 * 只数三项偏好开关，不读会话白名单，也不做云多租户。
 */

export type ApprovalPrefFlags = {
  requireWriteApproval: boolean
  requireBashApproval: boolean
  requireCommitApproval: boolean
}

/** 与预览三态对齐：默认 / 中态 / 警示。内部 id，不上 C 端。 */
export type ApprovalGradientTone = "default" | "partial" | "yolo"

const SUMMARY_KEY: Record<ApprovalGradientTone, string> = {
  default: "settings.approvalDiscover.summaryDefault",
  partial: "settings.approvalDiscover.summaryPartial",
  yolo: "settings.approvalDiscover.summaryYolo"
}

function autoCount(flags: ApprovalPrefFlags): number {
  return Number(!flags.requireWriteApproval) + Number(!flags.requireBashApproval) + Number(!flags.requireCommitApproval)
}

/** 三项全确认=默认，三项全自动=警示，其余（编辑档 / 自定义）=中态。 */
export function approvalGradientTone(flags: ApprovalPrefFlags): ApprovalGradientTone {
  const open = autoCount(flags)
  if (open === 3) return "yolo"
  if (open === 0) return "default"
  return "partial"
}

export function approvalGradientSummaryKey(tone: ApprovalGradientTone): string {
  return SUMMARY_KEY[tone]
}

export function approvalGradientStripClass(tone: ApprovalGradientTone): string {
  if (tone === "yolo") return "border-amber-500/30 bg-amber-500/10"
  if (tone === "partial") {
    return "border-border-button-default bg-gradient-to-r from-background-secondary-default via-accent-50 to-background-secondary-default"
  }
  return "border-border-button-default bg-background-primary-default"
}

export function approvalGradientTextClass(tone: ApprovalGradientTone): string {
  return tone === "yolo" ? "text-amber-700 dark:text-amber-400" : "text-text-primary"
}

export function approvalGradientLinkClass(tone: ApprovalGradientTone): string {
  return tone === "yolo" ? "text-amber-700 dark:text-amber-400" : "text-accent-600 hover:text-accent-500"
}
