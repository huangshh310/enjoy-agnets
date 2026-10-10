/**
 * 撤销归档后的侧栏序：只按 updated_at，不模拟 IPC。
 */
export type UndoOrderSession = {
  id: string
  updatedAt: number
}

export function sidebarIdsByUpdatedAt(sessions: UndoOrderSession[]): string[] {
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt).map((row) => row.id)
}

export function afterArchiveUndo(
  sessions: UndoOrderSession[],
  archivedId: string,
  selectedId: string,
  restoredUpdatedAt: number
): { ids: string[]; index: number; selectedId: string } {
  const next = sessions.map((row) =>
    row.id === archivedId ? { ...row, updatedAt: restoredUpdatedAt } : row
  )
  const ids = sidebarIdsByUpdatedAt(next)
  return { ids, index: ids.indexOf(archivedId), selectedId }
}
