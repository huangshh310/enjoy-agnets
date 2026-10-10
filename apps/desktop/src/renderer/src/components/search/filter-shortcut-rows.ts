/**
 * ⌘L 有关键字时只留标题 / 键位 / 说明命中的快捷键行。
 */
export function shortcutRowMatches(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return haystack.toLowerCase().includes(needle)
}
