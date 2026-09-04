/**
 * 情境栏搜索：按 label / keywords 过滤分组。
 */
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"

export function filterModuleNavGroups(
  groups: SecondaryNavGroup[],
  query: string,
  filterNav: boolean
): SecondaryNavGroup[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!filterNav || !normalized) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLocaleLowerCase()
        return haystack.includes(normalized)
      })
    }))
    .filter((group) => group.items.length > 0)
}
