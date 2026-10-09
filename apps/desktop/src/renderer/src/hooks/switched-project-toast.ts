/**
 * 删除后自动切到另一个项目时的轻 toast。删空不弹。
 */
import { showAppToast } from "../lib/app-toast.ts"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"
import type { WorkspaceRow } from "./workspace-row.ts"

export function switchedProjectToastMessage(
  name: string,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  return t("chat.switchedToProject", { name })
}

export function notifySwitchedProject(workspace: WorkspaceRow): void {
  const language = (
    queryClient.getQueryData(["settings"]) as
      | { preferences?: { language?: LanguagePref } }
      | undefined
  )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  showAppToast(switchedProjectToastMessage(workspace.name, (path, vars) => translate(messages, path, vars)), {
    id: "workspace-switched",
    testId: "workspace-switched-toast"
  })
}
