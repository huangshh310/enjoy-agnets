/**
 * 压缩错误码翻词表。slash 与检查器共用，禁止把英文码塞进 store.error。
 */
import { COMPACTION_ERROR } from "@enjoy-agents/ipc-contract"
import { en } from "@renderer/i18n/catalogs/en"
import { zh } from "@renderer/i18n/catalogs/zh"
import { translate } from "@renderer/i18n/lookup"

export function localizeCompactionError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const t = translateForDocument()
  if (raw.includes(COMPACTION_ERROR.tooShort)) return t("chat.compactSessionTooShort")
  if (raw.includes(COMPACTION_ERROR.notEligible)) return t("chat.compactSessionFailed")
  if (raw.includes("timed out")) return t("chat.compactSessionFailed")
  return t("chat.compactSessionFailed")
}

function translateForDocument(): (path: string) => string {
  const lang = typeof document === "undefined" ? "zh" : document.documentElement.lang
  const messages = lang.startsWith("en") ? en : zh
  return (path) => translate(messages, path)
}
