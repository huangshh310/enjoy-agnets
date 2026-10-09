/**
 * models.dev 离线快照。主路径只读这份本地表，不发网络请求。
 */
import type { PriceSnapshot, SnapshotModelRate } from "./types.ts"
import loaded from "./models-dev-snapshot.json" with { type: "json" }

export const PRICE_SNAPSHOT: PriceSnapshot = Object.freeze({
  version: String(loaded.version ?? ""),
  date: String(loaded.date ?? ""),
  source: String(loaded.source ?? "models.dev"),
  models: Array.isArray(loaded.models) ? loaded.models : []
})

export function snapshotLookupKey(provider: string, modelId: string): string {
  return `${provider}\0${modelId}`
}

export function buildSnapshotIndex(
  snapshot: PriceSnapshot = PRICE_SNAPSHOT
): Map<string, SnapshotModelRate> {
  const index = new Map<string, SnapshotModelRate>()
  for (const model of snapshot.models) {
    const provider = model.provider.trim()
    const modelId = model.modelId.trim()
    if (!provider || !modelId) continue
    index.set(snapshotLookupKey(provider, modelId), model)
    for (const alias of model.aliases ?? []) {
      const name = alias.trim()
      if (!name || name === modelId) continue
      const key = snapshotLookupKey(provider, name)
      if (!index.has(key)) index.set(key, model)
    }
  }
  return index
}

const DEFAULT_INDEX = buildSnapshotIndex(PRICE_SNAPSHOT)

export function lookupSnapshotRate(
  provider: string,
  modelId: string,
  snapshot?: PriceSnapshot
): SnapshotModelRate | undefined {
  const index = snapshot ? buildSnapshotIndex(snapshot) : DEFAULT_INDEX
  return index.get(snapshotLookupKey(provider.trim(), modelId.trim()))
}
