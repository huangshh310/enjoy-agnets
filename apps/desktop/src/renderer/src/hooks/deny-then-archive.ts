/**
 * 归档前若有未决审批：先走 Dock 同一条 agent.decide deny，再归档。
 * 确认框由 ArchiveApprovalGuard 挂载。
 */
import { getIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { decidePendingApproval } from "./use-agent-session"
import { archiveCurrentSession } from "./workspace-lifecycle"
import {
  archiveNeedsDenyConfirm,
  lookupSessionPendingApproval,
  type PendingApprovalHit
} from "./session-pending-approval"

type ArchivePrompt = { sessionId: string } | null

let prompt: ArchivePrompt = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribeArchivePrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function peekArchivePrompt(): ArchivePrompt {
  return prompt
}

export function requestArchiveSession(sessionId: string): void {
  if (archiveNeedsDenyConfirm(sessionId)) {
    prompt = { sessionId }
    emit()
    return
  }
  void archiveCurrentSession(sessionId)
}

export function cancelArchivePrompt(): void {
  prompt = null
  emit()
}

export async function confirmDenyAndArchive(): Promise<void> {
  const sessionId = prompt?.sessionId
  prompt = null
  emit()
  if (!sessionId) return
  await denyThenArchive(sessionId)
}

export async function denySessionPendingApproval(sessionId: string): Promise<boolean> {
  const hit = lookupSessionPendingApproval(sessionId)
  if (!hit) return false
  const store = useChatStore.getState()
  if (hit.source === "foreground" || (store.sessionId === sessionId && store.pendingApproval)) {
    await decidePendingApproval("deny")
  } else {
    await submitDenyDecision(hit)
  }
  hideSessionAttention(sessionId, hit.runId)
  return true
}

export async function denyThenArchive(sessionId: string): Promise<void> {
  await denySessionPendingApproval(sessionId)
  hideSessionAttention(sessionId)
  await archiveCurrentSession(sessionId)
}

export function hideSessionAttention(sessionId: string, runId?: string): void {
  const attention = useAttentionStore.getState()
  attention.resolveSessionDecisions(sessionId, runId)
  for (const item of useAttentionStore.getState().items) {
    if (item.sessionId === sessionId) attention.dismiss(item.id)
  }
  attention.takePark(sessionId)
}

async function submitDenyDecision(hit: PendingApprovalHit): Promise<void> {
  await getIde().agent.decide({
    runId: hit.runId,
    toolCallId: hit.approval.toolCallId,
    approvalId: hit.approval.approvalId,
    decision: "deny"
  })
}
