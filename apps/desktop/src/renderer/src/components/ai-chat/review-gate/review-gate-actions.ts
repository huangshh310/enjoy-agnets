/**
 * 打回 = 回到执行中（保留磁盘）。通过 = 标完成并收起闸。
 * 两钮都不调用 git commit / push。
 */
import { keepSessionReview } from "../composer/session-review/composer-session-review"
import { patchSessionWorkflow } from "./patch-session-workflow"

export async function rejectReviewGate(sessionId: string | null): Promise<void> {
  if (!sessionId) return
  await patchSessionWorkflow(sessionId, "in_progress")
}

export async function approveReviewGate(
  sessionId: string | null,
  filesKey: string
): Promise<void> {
  if (!sessionId) return
  keepSessionReview(filesKey)
  await patchSessionWorkflow(sessionId, "done")
}
