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
  return restoredImagesDetail(t, restoredImageCount, hasText)
}

/**
 * luna（main c849e3f4 巡检 P1）：出字前失败回滚的白卡也说清图回来了，原样复用看门狗那两句：
 * 只有图「图片已放回输入框」、有字有图「文字和图片已放回输入框」；没图返回 null（卡上不加这一行）。
 */
export function restoredImagesDetail(t: Translate, restoredImageCount: number, hasText: boolean): string | null {
  if (restoredImageCount <= 0) return null
  // luna：英文一张图用单数（"Your image is back…"），两张及以上复数；中文两套同句。
  if (restoredImageCount === 1) {
    return t(hasText ? "chat.sendFailedRestoreWithImageOne" : "chat.sendFailedRestoreImageOnlyOne")
  }
  return t(hasText ? "chat.sendFailedRestoreWithImages" : "chat.sendFailedRestoreImagesOnly")
}
