/**
 * 句首 `/computer-use`。大小写和首尾空白忽略。
 * 引号、代码块、引用开头不算，避免把粘贴的命令当成口令。
 */
const FENCED = /^(?:```|>|["'`])/

export function takeComputerUseSlash(text: string): { once: boolean; text: string } {
  const trimmed = text.trim()
  if (!trimmed || FENCED.test(trimmed)) return { once: false, text }
  const match = /^\/computer-use\b/i.exec(trimmed)
  if (!match) return { once: false, text }
  return { once: true, text: trimmed.slice(match[0].length).trim() }
}
