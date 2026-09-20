/**
 * 会话 workflowStatus 写穿。禁止 bump updated_at（session.patch 已守）。
 * 通过 / 打回都不走 git commit / push。
 */
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

export async function patchSessionWorkflow(
  sessionId: string,
  workflowStatus: SessionWorkflowStatus
): Promise<void> {
  const store = useChatStore.getState()
  const current = store.repositories.find((node) => node.id === sessionId)?.workflowStatus ?? null
  if (current === workflowStatus) return
  store.patchSessionNode(sessionId, { workflowStatus })
  if (!hasIde()) return
  try {
    await getIde().session.patch({ id: sessionId, workflowStatus })
  } catch {
    store.patchSessionNode(sessionId, { workflowStatus: current })
  }
}

export function currentSessionWorkflowStatus(): SessionWorkflowStatus | null {
  const store = useChatStore.getState()
  if (!store.sessionId) return null
  return store.repositories.find((node) => node.id === store.sessionId)?.workflowStatus ?? null
}
