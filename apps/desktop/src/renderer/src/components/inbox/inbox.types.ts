/**
 * 安静 Inbox：只吃拍板 / 待验收 / 失败。运行中与完成不进默认列。
 */
import type { AttentionKind, AttentionStatus } from "@renderer/stores/attention/attention.types"

export type InboxCategory = "approval" | "needs_review" | "failed"

/** 通知来源。错误进系统，其余进智能体运行。 */
export type InboxKind = "agent" | "system"

export type InboxActionKey = "openSession"

export type InboxGroupId = "today" | "yesterday" | "earlier"

export type InboxNotificationStatus = AttentionStatus | "running"

export type InboxCopyKey = AttentionKind | "running" | "aborted" | "needs_review"

export interface InboxNotification {
  id: string
  copyKey: InboxCopyKey
  title: string
  summary: string
  category: InboxKind
  read: boolean
  occurredAt: number
  sessionId: string
  workspaceId?: string
  workspaceName?: string
  actionKey: InboxActionKey
  actionLabel?: string
  status: InboxNotificationStatus
  sessionTitle?: string
  errorMessage?: string
  toolName?: string
  isAborted?: boolean
  changedFiles?: { names: string[]; total: number }
  completedAt?: string
}

export interface InboxGroup {
  id: InboxGroupId
  items: InboxNotification[]
}

export interface InboxNavCounts {
  approval: number
  needs_review: number
  failed: number
}
