/**
 * 会话题占位与乐观截断。main / renderer 共用，避免两套占位集合。
 * 剥 Enjoy 围栏后再截断，避免探索/目标垫句写进侧栏。
 */

export const DEFAULT_SESSION_TITLES = new Set([
  "New agent",
  "新对话",
  "新会话",
  "未命名会话",
  "Untitled",
  "Untitled session"
])

export function isDefaultSessionTitle(title?: string | null): boolean {
  if (!title) return true
  const trimmed = title.trim()
  return !trimmed || DEFAULT_SESSION_TITLES.has(trimmed)
}

/** 去掉 host-mode / session-context 围栏，再压空白。 */
export function stripTitleSource(raw: string): string {
  return raw
    .replace(/\[Enjoy host mode:[^\]]*\][\s\S]*?\[\/Enjoy host mode\]/gi, " ")
    .replace(/\[Enjoy session context\][\s\S]*?\[\/Enjoy session context\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function formatOptimisticTitle(userText: string): string {
  return stripTitleSource(userText).slice(0, 42) || "新对话"
}

/** 占位名或本轮乐观截断都可精炼 / 可被 CLI 标题覆盖；手改不覆盖。 */
export function shouldRefineSessionTitle(
  current: string | null | undefined,
  userText: string
): boolean {
  if (isDefaultSessionTitle(current)) return true
  return (current ?? "").trim() === formatOptimisticTitle(userText)
}
