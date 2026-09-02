/**
 * 将已配置模型按 Provider 分组，并按搜索词过滤。
 */
import type { ModelOption } from "@renderer/stores/chat-store"

export type ProviderModelGroup = {
  providerName: string
  providerKind: string
  items: ModelOption[]
}

export function groupModelsByProvider(models: ModelOption[]): ProviderModelGroup[] {
  const map = new Map<string, ProviderModelGroup>()
  for (const model of models) {
    const key = model.providerId || model.provider || "default"
    const name = model.providerName || model.provider || "Custom Provider"
    if (!map.has(key)) {
      map.set(key, { providerName: name, providerKind: model.provider, items: [] })
    }
    map.get(key)!.items.push(model)
  }
  return Array.from(map.values())
}

export function filterModelGroups(groups: ProviderModelGroup[], search: string): ProviderModelGroup[] {
  if (!search.trim()) return groups
  const query = search.toLowerCase().trim()
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (model) => model.id.toLowerCase().includes(query) || (model.label && model.label.toLowerCase().includes(query))
      )
    }))
    .filter((group) => group.items.length > 0)
}
