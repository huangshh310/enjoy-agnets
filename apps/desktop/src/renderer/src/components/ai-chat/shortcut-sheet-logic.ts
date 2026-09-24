/**
 * 快捷键表的分组和「现在能不能用 ? 打开」。目录仍是设置页那一份。
 */

type GroupItem = { id: string; category: string }

export function groupShortcutDefs<T extends GroupItem>(defs: readonly T[]): {
  global: T[]
  views: T[]
  chat: T[]
} {
  return {
    global: defs.filter((item) => item.category === "global"),
    views: defs.filter((item) => item.category === "views"),
    chat: defs.filter((item) => item.category === "chat")
  }
}

export function canOpenShortcutSheet(
  target: { tagName?: string; isContentEditable?: boolean } | null,
  threadVisible = true
): boolean {
  if (!threadVisible) return false
  if (!target) return true
  const tag = target.tagName ?? ""
  if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return false
  return true
}
