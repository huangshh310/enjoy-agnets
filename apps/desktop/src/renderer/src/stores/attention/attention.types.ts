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
  /** 跳回会话时切工作区；没有则从侧栏树补。 */
  workspaceId?: string
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
  workspaceId?: string
  now?: number
  /** 本轮工具全未执行：run.end 不弹「已完成」。 */
  omitComplete?: boolean
  /** 前台出字前失败不当「出错」/「需处理」。 */
  foreground?: boolean
}
