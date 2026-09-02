/**
 * 已归档会话的筛选与按项目分组。
 */

export type ArchivedChatRow = {
  id: string
  workspaceId: string
  workspaceName: string
  title: string
  updatedAt: number
  archivedAt: number
}

export type ArchivedChatGroup = {
  workspaceId: string
  workspaceName: string
  chats: ArchivedChatRow[]
}

export function filterArchivedChats(
  rows: ArchivedChatRow[],
  query: string,
  workspaceId: string | "all"
): ArchivedChatRow[] {
  const needle = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (workspaceId !== "all" && row.workspaceId !== workspaceId) return false
    if (!needle) return true
    return `${row.title} ${row.workspaceName}`.toLowerCase().includes(needle)
  })
}

export function groupArchivedByWorkspace(rows: ArchivedChatRow[]): ArchivedChatGroup[] {
  const groups = new Map<string, ArchivedChatGroup>()
  for (const row of rows) {
    const existing = groups.get(row.workspaceId)
    if (existing) {
      existing.chats.push(row)
      continue
    }
    groups.set(row.workspaceId, {
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName,
      chats: [row]
    })
  }
  return Array.from(groups.values())
}

export function formatArchivedAt(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(timestamp)
}
