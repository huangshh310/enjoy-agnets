/**
 * 一页历史只记稳定身份和恢复所需参数。
 * 不放滚动、输入草稿、流式半截内容。
 */
export type HistoryParams = {
  kind: "session" | "workspace" | "route"
  to: string
  sessionId?: string
  workspaceId?: string
  params?: Record<string, string>
  search?: Record<string, string>
}

export type HistoryEntry = {
  id: string
  title: string
  params?: HistoryParams
}

export type HistorySide = "past" | "future"

/** past 旧在前；future 最近离开的在末尾。 */
export type HistoryStack = {
  past: HistoryEntry[]
  current: HistoryEntry
  future: HistoryEntry[]
  seeded: boolean
  lastPushAt: number | null
  lastAction: "push" | "travel" | null
}
