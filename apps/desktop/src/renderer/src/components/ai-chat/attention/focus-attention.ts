/**
 * 打开 Chat 并切到目标会话；槽位标 focused。再滚到 Dock / 错误 / 本轮 turn。
 * 无参：只滚到当前会话 PermissionDock（M3 阻切「去处理审批」）。
 */
import { selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"
import { PERMISSION_DOCK_ID, revealAttentionAnchor } from "./attention-anchor"

export { PERMISSION_DOCK_ID }

type NavigateHome = (opts: { to: "/" }) => unknown

export async function focusAttention(input?: {
  sessionId: string
  workspaceId?: string
  kind?: AttentionKind
  navigate: NavigateHome
}): Promise<void> {
  if (!input?.sessionId) {
    revealPermissionDock()
    return
  }
  input.navigate({ to: "/" })
  useAttentionStore.getState().focusSlot(input.sessionId, input.kind)
  await selectPersistedSession(input.sessionId, input.workspaceId)
  revealAttentionAnchor(input.kind ?? "pending_approval")
}

/** 当前会话已在 Chat：滚到并聚焦 Composer 上沿 PermissionDock。 */
export function revealPermissionDock(): void {
  const el = document.getElementById(PERMISSION_DOCK_ID)
  if (!(el instanceof HTMLElement)) return
  el.scrollIntoView({ block: "nearest", behavior: "smooth" })
  el.focus({ preventScroll: true })
}
