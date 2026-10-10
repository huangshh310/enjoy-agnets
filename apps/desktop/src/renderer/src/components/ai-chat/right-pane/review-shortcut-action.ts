/**
 * ⌘/Ctrl+Shift+G：审查已展开则收起，否则打开。
 */
export function reviewShortcutAction(input: {
  collapsed: boolean
  activeKind?: string | null
}): "open" | "close" {
  if (!input.collapsed && input.activeKind === "review") return "close"
  return "open"
}
