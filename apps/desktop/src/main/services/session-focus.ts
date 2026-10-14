/**
 * 渲染层上报的当前聚焦会话。窗口失焦 / 关闭清掉，只活在内存。
 */
let focusedSessionId: string | null = null

export function setFocusedSessionId(sessionId: string | null): void {
  focusedSessionId = sessionId?.trim() || null
}

export function getFocusedSessionId(): string | null {
  return focusedSessionId
}

export function clearFocusedSessionId(): void {
  focusedSessionId = null
}
