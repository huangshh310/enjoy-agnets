/**
 * 归档成功 toast：已归档「X」+ 撤销，显式 5s（覆盖动作条默认驻留）。
 */
import { showAppToast } from "../lib/app-toast.ts"
import { ARCHIVE_UNDO_TOAST_MS } from "../lib/app-toast-policy.ts"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"
import { archivedToastMessage, type ArchiveToastTranslate } from "./archive-session-copy.ts"

export { archivedToastMessage, sessionTitleFromStore } from "./archive-session-copy.ts"
export type { ArchiveToastTranslate }

export function currentArchiveTranslate(): ArchiveToastTranslate {
  const language =
    (
      queryClient.getQueryData(["settings"]) as
        | { preferences?: { language?: LanguagePref } }
        | undefined
    )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  return (path, vars) => translate(messages, path, vars)
}

export function notifySessionArchived(sessionId: string, title: string, undo: () => void): void {
  const t = currentArchiveTranslate()
  showAppToast(archivedToastMessage(title, t), {
    id: `session-archived-${sessionId}`,
    testId: "session-archived-toast",
    duration: ARCHIVE_UNDO_TOAST_MS,
    action: {
      label: t("common.undo"),
      onClick: undo
    }
  })
}
