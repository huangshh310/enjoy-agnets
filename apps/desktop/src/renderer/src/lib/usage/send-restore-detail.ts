/**
 * jojo P3（#155）：发送失败还稿时，输入框里有图就说「文字和图片已放回输入框」，不能只说文字。
 * 「接在末尾」（merged）等其他还稿码照旧走 humanizeThreadError。
 */
import { classifyThreadError, humanizeThreadError, SEND_FAILED_RESTORE_MERGED } from "./classify-thread-error.ts"

type Translate = Parameters<typeof humanizeThreadError>[1]

export function sendRestoreDetail(error: string, t: Translate, restoredImageCount: number): string | null {
  if (restoredImageCount <= 0) return null
  if (error === SEND_FAILED_RESTORE_MERGED) return null
  if (classifyThreadError(error) !== "send_restore") return null
  return t("chat.sendFailedRestoreWithImages")
}
