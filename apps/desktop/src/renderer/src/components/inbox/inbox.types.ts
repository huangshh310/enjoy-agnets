/**
 * 消息中心数据类型定义。
 */
export type InboxCategory = "all" | "unread" | "agent" | "system"

export interface InboxNotification {
  id: string
  title: string
  summary: string
  category: "agent" | "system"
  read: boolean
  createdAt: string
  actionLabel?: string
  actionUrl?: string
}
