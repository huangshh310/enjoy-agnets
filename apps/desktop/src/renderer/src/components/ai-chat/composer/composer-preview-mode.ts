/**
 * Composer 预览轻态：仅本会话内存。冷启 / 新会话默认源码；不写用户设置。
 */
const previewBySession = new Map<string, boolean>()

const FALLBACK_KEY = "__no_session__"

function keyFor(sessionId: string | null | undefined): string {
  return sessionId && sessionId.length > 0 ? sessionId : FALLBACK_KEY
}

export function isComposerPreviewOpen(sessionId: string | null | undefined): boolean {
  return previewBySession.get(keyFor(sessionId)) === true
}

export function setComposerPreviewOpen(
  sessionId: string | null | undefined,
  open: boolean
): void {
  const key = keyFor(sessionId)
  if (open) previewBySession.set(key, true)
  else previewBySession.delete(key)
}

/** 发送清空草稿后关预览；测试可复位。 */
export function resetComposerPreviewModeForTest(): void {
  previewBySession.clear()
}
