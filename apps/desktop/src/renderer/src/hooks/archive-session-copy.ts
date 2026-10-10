/**
 * 归档 toast 纯文案：标题回退与「已归档「X」」。
 */
export type ArchiveToastTranslate = (path: string, vars?: Record<string, string | number>) => string

export function sessionTitleFromStore(
  sessionId: string,
  repositories: Array<{ id: string; name: string }>
): string {
  const name = repositories.find((node) => node.id === sessionId)?.name.trim()
  return name || sessionId
}

export function archivedToastMessage(title: string, t: ArchiveToastTranslate): string {
  return t("chat.archivedToast", { title })
}

export function restoredToastMessage(t: ArchiveToastTranslate): string {
  return t("chat.restoredToast")
}

export function undoArchiveFailedMessage(t: ArchiveToastTranslate): string {
  return t("chat.undoArchiveFailed")
}

export function archiveFailedMessage(t: ArchiveToastTranslate): string {
  return t("chat.archiveFailed")
}
