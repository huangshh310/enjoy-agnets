/**
 * 附件菜单插入 @ 或 /，避免重复叠两个触发符。
 */

export function insertMentionTrigger(text: string, cursor: number, token: "@" | "/"): {
  text: string
  cursor: number
} {
  const at = clamp(text, cursor)
  const before = text.slice(0, at)
  const after = text.slice(at)
  if (before.endsWith(token)) return { text, cursor: at }
  const pad = before.length === 0 || /\s$/.test(before) ? "" : " "
  const next = `${before}${pad}${token}${after}`
  return { text: next, cursor: before.length + pad.length + token.length }
}

function clamp(text: string, cursor: number): number {
  if (!Number.isFinite(cursor) || cursor < 0) return text.length
  return Math.min(Math.floor(cursor), text.length)
}
