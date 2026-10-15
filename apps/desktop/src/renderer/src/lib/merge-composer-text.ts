/**
 * 还回的稿与输入框里已有的字合并（无依赖叶子：chat-store 回滚补丁与发送失败还稿共用）。
 * 已键入的包含还回的 → 留已键入；还回的包含已键入的 → 用还回的；否则已键入在前、还回的接在后面。
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
