/**
 * ⌘L 会话范围：空查询只列最近 8 条；有关键字按标题全表过滤。
 */
export function filterQuickSearchSessions<T extends { name?: string }>(
  sessions: T[],
  query: string,
  emptyLimit = 8
): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return sessions.slice(0, emptyLimit)
  return sessions.filter((session) => (session.name ?? "").toLowerCase().includes(needle))
}
