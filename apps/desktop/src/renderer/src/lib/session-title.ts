/**
 * 会话题：占位/乐观规则在 ipc-contract；这里只留 sanitize。
 */
export {
  DEFAULT_SESSION_TITLES,
  formatOptimisticTitle,
  isDefaultSessionTitle,
  shouldRefineSessionTitle,
  stripTitleSource
} from "@enjoy-agents/ipc-contract/session-title"

export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/^["'《「『\s]+|["'》」』\s]+$/g, "")
    .replace(/^(Title|Topic|会话标题|标题)[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim()
}
