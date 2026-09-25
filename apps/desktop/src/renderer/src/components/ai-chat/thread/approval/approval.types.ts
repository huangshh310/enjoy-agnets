/**
 * 审批卡片三种表面与计划步骤。
 */
export type ApprovalVariant = "command" | "plan" | "questions" | "desktop"

/** 选项用稳定 id 决策，label 只给人看。 */
export type ApprovalQuestionOption = {
  id: string
  label: string
}

export type ApprovalQuestion = {
  id: string
  prompt: string
  options: ApprovalQuestionOption[]
}

export type ApprovalPlanStep = {
  id: string
  title: string
  detail?: string
}

export type ApprovalDecide = {
  onApprove: () => void
  onDeny: () => void
  onAllowSession: () => void
  /** 桌面卡第四项：始终允许此应用 → allow_always。非桌面卡可省略。 */
  onAllowAlways?: () => void
}

/** 桌面首次允许走选项+继续；其余表面仍是底栏按钮。 */
export type ApprovalFooter = "buttons" | "continue"

/** 底栏按钮：二次确认可覆盖 deny/allow testid。 */
export type ApprovalActionIds = {
  denyTestId?: string
  allowTestId?: string
}

/** Dock 桌面卡二次确认用 warn / 缺图 danger。 */
export type ApprovalTone = "warn" | "danger"
