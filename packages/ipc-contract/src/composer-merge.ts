/**
 * 还回的稿与输入框 / 草稿里已有的字合并。main（出字前回滚写回 session_drafts）与 renderer（回滚补丁、失败还稿）共用。
 * 已有的包含还回的 → 留已有；还回的包含已有的 → 用还回的；否则已有在前、还回的接在后面。
 */
export function mergeComposerText(restored: string, current: string): string {
  const queued = restored.trim()
  const typed = current.trim()
  if (!typed) return restored
  if (!queued) return current
  if (typed.includes(queued) || typed === queued) return current
  if (queued.includes(typed)) return restored
  return `${current}\n${restored}`
}
