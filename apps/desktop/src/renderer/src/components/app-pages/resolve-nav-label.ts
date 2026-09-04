/**
 * 从情境栏分组解析当前选中项标签。
 */
import type { SecondaryNavGroup } from "./secondary-nav.types"

export function resolveNavLabel(
  groups: SecondaryNavGroup[],
  selectedId: string,
  fallback?: string
): string {
  if (fallback) return fallback
  for (const group of groups) {
    const item = group.items.find((entry) => entry.id === selectedId)
    if (item) return item.label
  }
  return groups[0]?.label || "Section"
}
