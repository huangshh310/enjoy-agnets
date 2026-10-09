/**
 * 别名只留一对一且真实存在的 modelId（如带日期的 id）。
 * 家族名 / 一对多一律丢掉，禁止先出现者猜价。
 */
import type { SnapshotModelRate } from "./types.ts"

export function snapshotLookupKey(provider: string, modelId: string): string {
  return `${provider}\0${modelId}`
}

export function uniqueExistingAliases(models: SnapshotModelRate[]): SnapshotModelRate[] {
  const idsByProvider = new Map<string, Set<string>>()
  const aliasCount = new Map<string, number>()
  for (const model of models) {
    const provider = model.provider.trim()
    const ids = idsByProvider.get(provider) ?? new Set<string>()
    ids.add(model.modelId.trim())
    idsByProvider.set(provider, ids)
    for (const alias of model.aliases ?? []) {
      const name = alias.trim()
      if (!name) continue
      const key = snapshotLookupKey(provider, name)
      aliasCount.set(key, (aliasCount.get(key) ?? 0) + 1)
    }
  }
  return models.map((model) => {
    const provider = model.provider.trim()
    const ids = idsByProvider.get(provider) ?? new Set<string>()
    const aliases = (model.aliases ?? []).filter((alias) => {
      const name = alias.trim()
      if (!name || name === model.modelId.trim()) return false
      if ((aliasCount.get(snapshotLookupKey(provider, name)) ?? 0) !== 1) return false
      return ids.has(name)
    })
    const next = { ...model }
    if (aliases.length > 0) next.aliases = aliases
    else delete next.aliases
    return next
  })
}

/** 同供应商、价目相同的 `id-YYYYMMDD` 收成一对一别名。 */
export function datedIdAliases(models: SnapshotModelRate[]): SnapshotModelRate[] {
  const byProvider = new Map<string, SnapshotModelRate[]>()
  for (const model of models) {
    const list = byProvider.get(model.provider) ?? []
    list.push(model)
    byProvider.set(model.provider, list)
  }
  return models.map((model) => {
    const siblings = byProvider.get(model.provider) ?? []
    const aliases = new Set(model.aliases ?? [])
    for (const other of siblings) {
      if (other.modelId === model.modelId) continue
      if (!isDatedChild(model.modelId, other.modelId)) continue
      aliases.add(other.modelId)
    }
    return aliases.size > 0 ? { ...model, aliases: [...aliases] } : model
  })
}

function isDatedChild(canonical: string, candidate: string): boolean {
  return candidate.startsWith(`${canonical}-`) && /^\d{8}$/.test(candidate.slice(canonical.length + 1))
}
