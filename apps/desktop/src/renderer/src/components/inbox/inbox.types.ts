/**
 * 收件箱领域类型：分类过滤、预置通知与时间分组。
 */

export type InboxCategory = "all" | "unread" | "agent" | "system"

/** 通知来源。侧栏「智能体运行 / 系统与安全」与此对齐。 */
export type InboxKind = "agent" | "system"

/** 预置文案键，对应 i18n `pages.inbox.seed.*`。 */
export type InboxCopyKey =
  | "rustRefactor"
  | "shellApproved"
  | "hmacBound"
  | "knowledgeIndexed"
  | "contextCompacted"
  | "engineReady"
  | "providerHealthy"
  | "teamWelcome"

/** 行内跳转，由页面映射到真实 Hash 路由，禁止把路径当 `to: "/"` 撒谎。 */
export type InboxActionKey =
  | "openSession"
  | "openSandbox"
  | "openKnowledge"
  | "openProviders"
  | "openTeam"

export type InboxGroupId = "today" | "yesterday" | "earlier"

export interface InboxSeed {
  id: string
  copyKey: InboxCopyKey
  category: InboxKind
  /** 相对「页面挂载时刻」的毫秒偏移，越大越早。 */
  offsetMs: number
  actionKey?: InboxActionKey
}

export interface InboxNotification {
  id: string
  copyKey: InboxCopyKey
  title: string
  summary: string
  category: InboxKind
  read: boolean
  occurredAt: number
  actionKey?: InboxActionKey
  actionLabel?: string
}

export interface InboxGroup {
  id: InboxGroupId
  items: InboxNotification[]
}

export interface InboxNavCounts {
  all: number
  unread: number
  agent: number
  system: number
}
