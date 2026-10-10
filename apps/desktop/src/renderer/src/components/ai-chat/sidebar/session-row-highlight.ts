/**
 * 「进行中」可与项目树各画一行。高亮只跟用户点中的那一行，不要两行同时亮。
 */
export type SessionRowSurface = "active" | "tree"

export type SessionRowClick = {
  id: string
  surface: SessionRowSurface
}

export function isSessionRowActive(
  sessionId: string,
  currentId: string | null,
  clicked: SessionRowClick | null,
  surface: SessionRowSurface
): boolean {
  if (sessionId !== currentId) return false
  if (!clicked || clicked.id !== currentId) return surface === "tree"
  return clicked.surface === surface
}
