/**
 * 打开 Chat 并切到目标会话；槽位标 focused。
 */
import { selectPersistedSession } from "@renderer/hooks/session-lifecycle"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"

type NavigateHome = (opts: { to: "/" }) => unknown

export async function focusAttention(input: {
  sessionId: string
  kind?: AttentionKind
  navigate: NavigateHome
}): Promise<void> {
  if (!input.sessionId) return
  input.navigate({ to: "/" })
  useAttentionStore.getState().focusSlot(input.sessionId, input.kind)
  await selectPersistedSession(input.sessionId)
}
