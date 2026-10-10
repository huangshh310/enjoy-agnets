/**
 * 归档前若有未决审批：先走 Dock 同一条 agent.decide deny，等返回再归档。
 * 确认框由 ArchiveApprovalGuard 挂载。失败必须 toast，禁止静默。
 * kai 主进程若已 deny，这里再 decide 会找不到未决，继续归档即可。
 */
import { getIde } from "../lib/ide"
import { showAppToast } from "../lib/app-toast"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { decidePendingApprovalOrThrow } from "./use-agent-session"
import { archiveCurrentSession } from "./workspace-lifecycle"
import {
  archiveFailedMessage,
  currentArchiveTranslate
} from "./archive-session-toast"
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
  void archiveCurrentSession(sessionId).catch(notifyArchiveFailed)
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
  await submitDenyDecision(sessionId, hit)
  hideSessionAttention(sessionId, hit.runId)
  return true
}

export async function denyThenArchive(sessionId: string): Promise<void> {
  try {
    await denyAllPendingApprovals(sessionId)
    hideSessionAttention(sessionId)
    await archiveCurrentSession(sessionId)
  } catch (error) {
    notifyArchiveFailed(error)
    throw error
  }
}

async function denyAllPendingApprovals(sessionId: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const hit = lookupSessionPendingApproval(sessionId)
    if (!hit) return
    await submitDenyDecision(sessionId, hit)
    hideSessionAttention(sessionId, hit.runId)
  }
}

export function hideSessionAttention(sessionId: string, runId?: string): void {
  const attention = useAttentionStore.getState()
  attention.resolveSessionDecisions(sessionId, runId)
  for (const item of useAttentionStore.getState().items) {
    if (item.sessionId === sessionId) attention.dismiss(item.id)
  }
  attention.takePark(sessionId)
}

async function submitDenyDecision(sessionId: string, hit: PendingApprovalHit): Promise<void> {
  const store = useChatStore.getState()
  if (hit.source === "foreground" || (store.sessionId === sessionId && store.pendingApproval)) {
    await decidePendingApprovalOrThrow("deny")
    return
  }
  await getIde().agent.decide({
    runId: hit.runId,
    toolCallId: hit.approval.toolCallId,
    approvalId: hit.approval.approvalId,
    decision: "deny"
  })
}

function notifyArchiveFailed(_error?: unknown): void {
  showAppToast(archiveFailedMessage(currentArchiveTranslate()), {
    id: "session-archive-failed",
    testId: "session-archive-failed-toast",
    tone: "error"
  })
}
