/**
 * 本地工单下一态。禁止把待验收覆写成执行中 / 待办。
 */
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"

/** 流事件不得把待验收覆写成执行中 / 待办。运行中只靠 running。 */
export function nextLocalSessionWorkflow(
  current: SessionWorkflowStatus | null | undefined,
  next: SessionWorkflowStatus
): SessionWorkflowStatus | null {
  if (current === next) return null
  if (current === "needs_review" && (next === "in_progress" || next === "todo")) return null
  return next
}
