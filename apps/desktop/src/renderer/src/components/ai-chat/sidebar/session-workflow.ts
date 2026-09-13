/**
 * 会话工作流状态元数据与辅助函数：Todo / In Progress / Needs Review / Done。
 * 语义 Token 纯净，严禁 hardcode hex 颜色。
 */
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"

export type { SessionWorkflowStatus }

export type WorkflowStatusMeta = {
  status: SessionWorkflowStatus
  labelKey: string
  colorClass: string
  badgeBgClass: string
  iconName: "todo" | "in_progress" | "needs_review" | "done"
}

export const WORKFLOW_STATUSES: Record<SessionWorkflowStatus, WorkflowStatusMeta> = {
  todo: {
    status: "todo",
    labelKey: "chat.statusTodo",
    colorClass: "text-text-tertiary",
    badgeBgClass: "bg-background-secondary-hover text-text-secondary",
    iconName: "todo"
  },
  in_progress: {
    status: "in_progress",
    labelKey: "chat.statusInProgress",
    colorClass: "text-accent-600 dark:text-accent-400",
    badgeBgClass: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
    iconName: "in_progress"
  },
  needs_review: {
    status: "needs_review",
    labelKey: "chat.statusNeedsReview",
    colorClass: "text-text-warning-primary",
    badgeBgClass: "bg-text-warning-primary/10 text-text-warning-primary",
    iconName: "needs_review"
  },
  done: {
    status: "done",
    labelKey: "chat.statusDone",
    colorClass: "text-text-success-primary",
    badgeBgClass: "bg-text-success-primary/10 text-text-success-primary",
    iconName: "done"
  }
}

export const WORKFLOW_STATUS_LIST: SessionWorkflowStatus[] = [
  "in_progress",
  "needs_review",
  "todo",
  "done"
]

export function getWorkflowStatusMeta(
  status?: SessionWorkflowStatus | null
): WorkflowStatusMeta | null {
  if (!status) return null
  return WORKFLOW_STATUSES[status] ?? null
}
