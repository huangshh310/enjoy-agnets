/**
 * CLI 模型按 provider/model 分组。只有两家及以上供应商才分栏。
 */
import type { AgentCliModel } from "@enjoy-agents/ipc-contract"

export type CliModelGroup = {
  key: string
  label: string
  models: AgentCliModel[]
}

export function providerKeyOf(modelId: string): string {
  const slash = modelId.indexOf("/")
  return slash > 0 ? modelId.slice(0, slash) : ""
}

export function formatCliProviderLabel(key: string): string {
  return key
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function groupCliModels(models: AgentCliModel[]): CliModelGroup[] {
  const buckets = new Map<string, AgentCliModel[]>()
  for (const model of models) {
    const key = providerKeyOf(model.id) || "_"
    const list = buckets.get(key) ?? []
    list.push(model)
    buckets.set(key, list)
  }
  return [...buckets.entries()].map(([key, items]) => ({
    key,
    label: key === "_" ? key : formatCliProviderLabel(key),
    models: items
  }))
}

export function shouldSplitCliProviders(models: AgentCliModel[]): boolean {
  const keys = new Set(models.map((item) => providerKeyOf(item.id)).filter(Boolean))
  return keys.size >= 2
}

export function initialCliProviderKey(models: AgentCliModel[], selectedId?: string): string {
  const selectedKey = selectedId ? providerKeyOf(selectedId) : ""
  if (selectedKey) return selectedKey
  return groupCliModels(models)[0]?.key ?? "all"
}
