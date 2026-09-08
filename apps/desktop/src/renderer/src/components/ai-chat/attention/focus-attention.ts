/**
 * 打开 Chat 并切到目标会话；槽位标 focused。决策面滚到 PermissionDock。
 */
import { selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"

type NavigateHome = (opts: { to: "/" }) => unknown

export async function focusAttention(input: {
  sessionId: string
  workspaceId?: string
  kind?: AttentionKind
  navigate: NavigateHome
}): Promise<void> {
  if (!input.sessionId) return
  input.navigate({ to: "/" })
  useAttentionStore.getState().focusSlot(input.sessionId, input.kind)
  await selectPersistedSession(input.sessionId, input.workspaceId)
  revealDock(input.kind)
}

function revealDock(kind?: AttentionKind) {
  if (kind !== "pending_approval" && kind !== "ask_user") return
  window.setTimeout(() => {
    document.getElementById("permission-dock")?.scrollIntoView({ block: "nearest" })
  }, 0)
}
