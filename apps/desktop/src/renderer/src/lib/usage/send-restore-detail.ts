/**
 * jojo P3 / luna（#155）：发送失败还稿按输入框里实际还回的内容说：
 * 只有图「图片已放回输入框」、有字有图「文字和图片已放回输入框」、只有字走默认「内容已放回输入框」。
 * 「接在末尾」（merged）等其他还稿码照旧走 humanizeThreadError。
 */
import { classifyThreadError, humanizeThreadError, SEND_FAILED_RESTORE_MERGED } from "./classify-thread-error.ts"

type Translate = Parameters<typeof humanizeThreadError>[1]

export function sendRestoreDetail(
  error: string,
  t: Translate,
  restoredImageCount: number,
  hasText = true
): string | null {
  if (restoredImageCount <= 0) return null
  if (error === SEND_FAILED_RESTORE_MERGED) return null
  if (classifyThreadError(error) !== "send_restore") return null
  return t(hasText ? "chat.sendFailedRestoreWithImages" : "chat.sendFailedRestoreImagesOnly")
}
