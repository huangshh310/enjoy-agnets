/**
 * 向 main 报告前台会话。150ms 防抖；blur / unload 传 null。
 * 未 bind sender 时不记 lastSent，等 useSessionFocus 挂上后再发。
 */
export const SESSION_FOCUS_DEBOUNCE_MS = 150

export type SessionFocusInput = { sessionId: string | null }
export type SessionFocusSender = (input: SessionFocusInput) => Promise<unknown> | unknown

let timer: ReturnType<typeof setTimeout> | null = null
let lastSent: string | null | undefined
let sender: SessionFocusSender | null = null

export function bindSessionFocusSender(next: SessionFocusSender | null): void {
  sender = next
}

export function resetSessionFocusForTest(): void {
  if (timer) clearTimeout(timer)
  timer = null
  lastSent = undefined
  sender = null
}

export function reportSessionFocused(
  sessionId: string | null,
  opts?: { immediate?: boolean }
): void {
  if (opts?.immediate) {
    flush(sessionId)
    return
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    flush(sessionId)
  }, SESSION_FOCUS_DEBOUNCE_MS)
}

function flush(sessionId: string | null): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (!sender) return
  if (lastSent === sessionId) return
  lastSent = sessionId
  try {
    void Promise.resolve(sender({ sessionId })).catch(() => undefined)
  } catch {
    // preload / 测试无 handle 时吞掉
  }
}
