/**
 * 截断失败人话：稳定码翻词表，不要摊 IPC 前缀。
 */
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"
import {
  TRUNCATE_RUN_ACTIVE,
  TRUNCATE_STALE_SNAPSHOT
} from "@enjoy-agents/ipc-contract/session-truncate"

export function translateTruncateNotice(code: string): string {
  const language =
    (
      queryClient.getQueryData(["settings"]) as
        | { preferences?: { language?: LanguagePref } }
        | undefined
    )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  if (code === TRUNCATE_RUN_ACTIVE) return translate(messages, "chat.truncateRunActive")
  if (code === TRUNCATE_STALE_SNAPSHOT) return translate(messages, "chat.truncateStaleSnapshot")
  return translate(messages, "chat.rewindFailed")
}

export function isTruncateRetryable(code: string | null): boolean {
  return code === TRUNCATE_STALE_SNAPSHOT
}
