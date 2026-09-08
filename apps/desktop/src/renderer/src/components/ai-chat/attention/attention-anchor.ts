/**
 * 点胶囊后滚到的唯一锚：Dock / 错误横幅 / 本轮助手 turn。
 */
import type { AttentionKind } from "@renderer/stores/attention/attention.types"

export const ATTENTION_ANCHOR = {
  dock: "permission-dock",
  error: "thread-error-banner",
  complete: "thread-turn-end"
} as const

export const PERMISSION_DOCK_ID = ATTENTION_ANCHOR.dock

export function attentionAnchorId(kind?: AttentionKind): string | null {
  if (kind === "pending_approval" || kind === "ask_user") return ATTENTION_ANCHOR.dock
  if (kind === "error") return ATTENTION_ANCHOR.error
  if (kind === "complete") return ATTENTION_ANCHOR.complete
  return null
}

export function revealAttentionAnchor(kind?: AttentionKind): void {
  const id = attentionAnchorId(kind)
  if (!id) return
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ block: "nearest" })
  }, 0)
}
