/**
 * jojo 红卡：上一发的「没发出去」红卡在下一发开始时收掉，不与「思考中」同屏。
 * 「上一条还在准备」不是失败结局，不在这里收。
 */
import {
  SEND_FAILED_RESTORE,
  SEND_FAILED_RESTORE_MERGED,
  SESSION_CREATE_TIMEOUT,
  SESSION_NOT_READY
} from "../../lib/usage/classify-thread-error"

const DISMISS_ON_NEXT_SEND = new Set<string>([
  SEND_FAILED_RESTORE,
  SEND_FAILED_RESTORE_MERGED,
  SESSION_CREATE_TIMEOUT,
  SESSION_NOT_READY
])

export function shouldDismissOnNextSend(error: string | null | undefined): boolean {
  return Boolean(error && DISMISS_ON_NEXT_SEND.has(error))
}
