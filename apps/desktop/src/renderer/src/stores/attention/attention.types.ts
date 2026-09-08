/**
 * Attention 槽位：一会话一种 kind 只占一格。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export const ATTENTION_KINDS = [
  "pending_approval",
  "ask_user",
  "error",
  "complete"
] as const

export type AttentionKind = (typeof ATTENTION_KINDS)[number]

export const ATTENTION_STATUSES = [
  "active",
  "focused",
  "resolved",
  "dismissed",
  "expired"
] as const

export type AttentionStatus = (typeof ATTENTION_STATUSES)[number]

export type AttentionApproval = StreamEvent & { type: "approval.required" }

export type AttentionItem = {
  id: string
  sessionId: string
  sessionTitle: string
  kind: AttentionKind
  status: AttentionStatus
  runId: string
  occurredAt: number
  summary: string
  approval?: AttentionApproval
  errorMessage?: string
}

export type ParkedRun = {
  sessionId: string
  runId: string | null
  running: boolean
  runStartedAt: number | null
  pendingApproval: AttentionApproval | null
  error: string | null
  thinkingLabel: string
  pendingStreamEvents: StreamEvent[]
}

export type IngestAttentionInput = {
  event: StreamEvent
  sessionId: string
  sessionTitle: string
  now?: number
}
