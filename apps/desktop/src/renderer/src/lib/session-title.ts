/**
 * 会话题占位与乐观/精炼规则（纯函数）。
 * 主进程 persist-session.maybeRenameSession 的占位集合必须与 DEFAULT_SESSION_TITLES 对齐。
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

/** 去掉模型爱加的引号、书名号和「标题：」前缀。 */
export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/^["'《「『\s]+|["'》」』\s]+$/g, "")
    .replace(/^(Title|Topic|会话标题|标题)[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim()
}

export function formatOptimisticTitle(userText: string): string {
  return userText.replace(/\s+/g, " ").trim().slice(0, 42) || "新对话"
}

/** 占位名或本轮乐观截断都可精炼；用户手改过的不覆盖。 */
export function shouldRefineSessionTitle(
  current: string | null | undefined,
  userText: string
): boolean {
  if (isDefaultSessionTitle(current)) return true
  return (current ?? "").trim() === formatOptimisticTitle(userText)
}
