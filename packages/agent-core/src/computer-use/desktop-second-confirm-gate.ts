/**
 * 二次确认闸：stash / needsSecondConfirm 盖住会话白名单，强制再问。
 * 缩略图路径仍在 desktop 数据面；这里只记「这号必须再审批」。
 */
const pending = new Set<string>()

/** act 回 needs_second_confirm 时登记新观察号。 */
export function rememberDesktopSecondConfirmGate(observationId: string): void {
  const id = observationId.trim()
  if (id) pending.add(id)
}

export function forgetDesktopSecondConfirmGate(observationId: string): void {
  pending.delete(observationId.trim())
}

export function clearDesktopSecondConfirmGate(): void {
  pending.clear()
}

/** 审批入参带二次确认标记，或 stash 命中该 observationId。 */
export function desktopActNeedsSecondConfirm(args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const row = args as Record<string, unknown>
  if (row.needsSecondConfirm === true) return true
  if (row.code === "needs_second_confirm") return true
  if (hasText(row.previousThumbnailPath) || hasText(row.previousThumbnailDataUrl)) return true
  const id = typeof row.observationId === "string" ? row.observationId.trim() : ""
  return Boolean(id && pending.has(id))
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}
