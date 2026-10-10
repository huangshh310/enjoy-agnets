/**
 * 任意会话的未决审批：前台 store / 后台 park / Attention 槽。
 * 归档前用这个判断要不要走「拒绝并归档」。
 */
import type { AttentionApproval, AttentionItem, ParkedRun } from "../stores/attention/attention.types"
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { resolveApprovalRunId } from "./resolve-approval-run"

export type PendingApprovalHit = {
  approval: AttentionApproval
  runId: string
  source: "foreground" | "park" | "attention"
}

export function findSessionPendingApproval(input: {
  sessionId: string
  foregroundSessionId: string | null
  foregroundRunId: string | null
  foregroundPending: AttentionApproval | null
  park?: Pick<ParkedRun, "pendingApproval" | "runId"> | null
  attention?: readonly AttentionItem[]
}): PendingApprovalHit | null {
  if (
    input.sessionId &&
    input.sessionId === input.foregroundSessionId &&
    input.foregroundPending
  ) {
    const runId = resolveApprovalRunId(input.foregroundPending, input.foregroundRunId)
    if (runId) return { approval: input.foregroundPending, runId, source: "foreground" }
  }
  const parkApproval = input.park?.pendingApproval
  if (parkApproval) {
    const runId = resolveApprovalRunId(parkApproval, input.park?.runId)
    if (runId) return { approval: parkApproval, runId, source: "park" }
  }
  const slot = (input.attention ?? []).find(
    (item) =>
      item.sessionId === input.sessionId &&
      (item.status === "active" || item.status === "focused") &&
      (item.kind === "pending_approval" || item.kind === "ask_user") &&
      item.approval
  )
  if (slot?.approval) {
    const runId = resolveApprovalRunId(slot.approval, slot.runId)
    if (runId) return { approval: slot.approval, runId, source: "attention" }
  }
  return null
}

export function lookupSessionPendingApproval(sessionId: string): PendingApprovalHit | null {
  const chat = useChatStore.getState()
  const attention = useAttentionStore.getState()
  return findSessionPendingApproval({
    sessionId,
    foregroundSessionId: chat.sessionId,
    foregroundRunId: chat.runId,
    foregroundPending: chat.pendingApproval,
    park: attention.parks[sessionId] ?? null,
    attention: attention.items
  })
}

export function archiveNeedsDenyConfirm(sessionId: string): boolean {
  return lookupSessionPendingApproval(sessionId) != null
}
