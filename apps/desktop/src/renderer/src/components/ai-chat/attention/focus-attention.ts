/**
 * 打开 Chat 并切到目标会话；槽位标 focused。再滚到 Dock / 错误 / 本轮 turn。
 */
import { selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"
import { revealAttentionAnchor } from "./attention-anchor"

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
  revealAttentionAnchor(input.kind)
}
