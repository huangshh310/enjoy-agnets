/**
 * 打回 = 回到执行中（保留磁盘）。通过 = 标完成并收起闸。
 * 两钮都不调用 git commit / push。
 */
import { keepSessionReview } from "../composer/session-review/composer-session-review"
import { focusComposerEndAfterPaint } from "@renderer/hooks/composer-focus"
import { setComposerPlaceholderHint } from "@renderer/hooks/composer-placeholder-hint"
import { showAppToast } from "@renderer/lib/app-toast"
import { patchSessionWorkflow } from "./patch-session-workflow"

/** 打回后：Composer 对焦、占位换成「说说哪里要改…」、提示「已打回」。 */
export async function rejectReviewGate(
  sessionId: string | null,
  copy?: { placeholder: string; toast: string }
): Promise<void> {
  if (!sessionId) return
  await patchSessionWorkflow(sessionId, "in_progress")
  if (!copy) return
  setComposerPlaceholderHint({ sessionId, text: copy.placeholder })
  focusComposerEndAfterPaint()
  showAppToast(copy.toast, { testId: "review-gate-rejected-toast" })
}

export async function approveReviewGate(
  sessionId: string | null,
  filesKey: string
): Promise<void> {
  if (!sessionId) return
  keepSessionReview(filesKey)
  await patchSessionWorkflow(sessionId, "done")
}
