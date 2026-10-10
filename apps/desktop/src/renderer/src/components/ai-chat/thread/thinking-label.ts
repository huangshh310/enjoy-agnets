/**
 * Composer / 线程状态条：默认面不露 desktop act / Waiting for approval 原文。
 */
import type { TranslateFn } from "../../../i18n/use-i18n.ts"
import { isDevCopyEnabled } from "../../../lib/dev-copy.ts"

const KNOWN_LABELS: Record<string, string> = {
  Thinking: "chat.thinking",
  Writing: "chat.writing",
  "Waiting for approval": "chat.waitingForApp",
  Sources: "chat.thinkingSources",
  Voice: "chat.thinkingVoice",
  Asset: "chat.thinkingAsset",
  Structured: "chat.thinkingStructured",
  "MCP App": "chat.thinkingMcpApp"
}

export function displayThinkingLabel(raw: string, t: TranslateFn): string {
  if (!raw.trim()) return t("chat.working")
  const mapped = KNOWN_LABELS[raw]
  if (mapped) return t(mapped)
  if (isDevCopyEnabled()) return raw
  const id = raw.replaceAll(" ", "_")
  if (id.startsWith("desktop_")) return t("chat.toolDesktop")
  if (/^[A-Za-z][A-Za-z0-9 _-]*$/.test(raw)) return t("chat.working")
  return raw
}
