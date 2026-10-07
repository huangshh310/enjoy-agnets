/**
 * 把 models.list 收成供应商分组，给双栏选择器复用。
 */
import type { ModelOption } from "@renderer/stores/chat-store"
import { formatProviderTitle, type ProviderGroup } from "./model-picker-types"

export function groupModelsByProvider(models: ModelOption[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>()
  for (const model of models) {
    const key = model.providerId || model.provider || "default"
    const existing = groups.get(key)
    if (existing) {
      if (!existing.models.some((item) => item.id === model.id)) existing.models.push(model)
      continue
    }
    groups.set(key, {
      key,
      provider: model.provider,
      providerId: model.providerId,
      providerName: model.providerName || formatProviderTitle(model.provider),
      apiStyle: model.apiStyle,
      wireStyles: model.wireStyles,
      active: model.active,
      models: [model]
    })
  }
  return Array.from(groups.values())
}
