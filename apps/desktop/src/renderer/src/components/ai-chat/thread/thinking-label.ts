/**
 * Composer / 线程状态条：默认面不露 desktop act / Waiting for approval 原文。
 */
import type { TranslateFn } from "../../../i18n/use-i18n.ts"
import { isDevCopyEnabled } from "../../../lib/dev-copy.ts"

export function displayThinkingLabel(raw: string, t: TranslateFn): string {
  if (!raw.trim()) return t("chat.working")
  if (raw === "Waiting for approval") return t("chat.waitingForApp")
  if (raw === "Sources") return t("chat.thinkingSources")
  if (isDevCopyEnabled()) return raw
  const id = raw.replaceAll(" ", "_")
  if (id.startsWith("desktop_")) return t("chat.toolDesktop")
  return raw
}
