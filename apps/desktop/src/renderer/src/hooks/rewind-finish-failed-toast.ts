/**
 * luna n167 P2：「还没能放回输入框」toast 延迟约 300ms 再弹。
 * - 300ms 内原话已成功放回输入框 → 不弹
 * - 切会话 / 卸载 → 清 timer，不弹
 */
export const REWIND_FINISH_FAILED_TOAST_DELAY_MS = 300

let timer: ReturnType<typeof setTimeout> | null = null
let sessionUnsub: (() => void) | null = null

export function clearRewindFinishFailedToast(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  sessionUnsub?.()
  sessionUnsub = null
}

/**
 * 安排延迟 toast。可注入 getSessionId + subscribeSession，切会话时自动清。
 * 测试里不传订阅，直接 tick / clear。
 */
export function scheduleRewindFinishFailedToast(
  show: () => void,
  opts?: {
    getSessionId?: () => string | null | undefined
    subscribeSession?: (listener: () => void) => () => void
  }
): void {
  clearRewindFinishFailedToast()
  const startedSession = opts?.getSessionId?.()
  timer = setTimeout(() => {
    timer = null
    sessionUnsub?.()
    sessionUnsub = null
    show()
  }, REWIND_FINISH_FAILED_TOAST_DELAY_MS)
  ;(timer as { unref?: () => void }).unref?.()

  if (opts?.subscribeSession && opts.getSessionId) {
    sessionUnsub = opts.subscribeSession(() => {
      if (opts.getSessionId!() !== startedSession) clearRewindFinishFailedToast()
    })
  }
}

/** 原话已成功放回输入框：取消尚未弹出的「还没能放回」toast。 */
export function cancelRewindFinishFailedToastOnRestored(): void {
  clearRewindFinishFailedToast()
}

/** 测试用：当前是否挂着延迟 toast。 */
export function rewindFinishFailedToastPendingForTest(): boolean {
  return timer !== null
}
