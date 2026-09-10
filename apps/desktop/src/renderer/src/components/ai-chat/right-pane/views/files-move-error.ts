/**
 * workspace.move 英文码翻成 Files 词条。
 */
import type { TranslateFn } from "@renderer/i18n"

export function moveFailureCopy(err: unknown, t: TranslateFn): string {
  const code = err instanceof Error ? err.message : ""
  if (code === "MOVE_EXISTS") return t("chat.moveExists")
  if (code === "MOVE_INTO_SELF") return t("chat.moveIntoSelf")
  if (code === "MOVE_NOT_FOUND") return t("chat.moveMissing")
  if (code.includes("escapes") || code.includes("Absolute")) return t("chat.moveEscape")
  return t("chat.couldNotMove")
}
