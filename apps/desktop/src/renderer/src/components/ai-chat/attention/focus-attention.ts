/**
 * 滚到并聚焦当前会话的审批挂载点。
 * M2 PermissionDock 未改位前，挂载点是 Thread 内现有审批卡。
 */
export const PERMISSION_DOCK_ID = "permission-dock"

export function focusAttention(): void {
  const el = document.getElementById(PERMISSION_DOCK_ID)
  if (!(el instanceof HTMLElement)) return
  el.scrollIntoView({ block: "nearest", behavior: "smooth" })
  el.focus({ preventScroll: true })
}
