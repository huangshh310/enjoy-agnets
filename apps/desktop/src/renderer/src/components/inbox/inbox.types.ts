/**
 * 收件箱档案：只吃 Attention 实况，按时间分组。
 */
import type { AttentionKind, AttentionStatus } from "@renderer/stores/attention/attention.types"

export type InboxCategory = "all" | "unread" | "running" | "waiting" | "failed" | "complete"

/** 通知来源。错误进系统，其余进智能体运行。 */
export type InboxKind = "agent" | "system"

export type InboxActionKey = "openSession"

export type InboxGroupId = "today" | "yesterday" | "earlier"

export type InboxNotificationStatus = AttentionStatus | "running"

export interface InboxNotification {
  id: string
  copyKey: AttentionKind | "running"
  title: string
  summary: string
  category: InboxKind
  read: boolean
  occurredAt: number
  sessionId: string
  workspaceId?: string
  actionKey: InboxActionKey
  actionLabel?: string
  status: InboxNotificationStatus
}

export interface InboxGroup {
  id: InboxGroupId
  items: InboxNotification[]
}

export interface InboxNavCounts {
  all: number
  unread: number
  running: number
  waiting: number
  failed: number
  complete: number
}
