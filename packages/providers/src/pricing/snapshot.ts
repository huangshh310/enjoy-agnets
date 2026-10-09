/**
 * models.dev 离线快照。主路径只读这份本地表，不发网络请求。
 * 别名在建索引时再滤一遍一对多 / 非真实 id。
 */
import type { PriceSnapshot, SnapshotModelRate } from "./types.ts"
import { snapshotLookupKey, uniqueExistingAliases } from "./alias-policy.ts"
import { uniqueCatalogForKind } from "./models-dev-kind.ts"
import loaded from "./models-dev-snapshot.json" with { type: "json" }

export const PRICE_SNAPSHOT: PriceSnapshot = Object.freeze({
  version: String(loaded.version ?? ""),
  date: String(loaded.date ?? ""),
  source: String(loaded.source ?? "models.dev"),
  sourceUrl: typeof loaded.sourceUrl === "string" ? loaded.sourceUrl : undefined,
  sourceEtag: typeof loaded.sourceEtag === "string" ? loaded.sourceEtag : undefined,
  sourceSha256: typeof loaded.sourceSha256 === "string" ? loaded.sourceSha256 : undefined,
  models: uniqueExistingAliases(Array.isArray(loaded.models) ? loaded.models : [])
})

export function buildSnapshotIndex(
  snapshot: PriceSnapshot = PRICE_SNAPSHOT
): Map<string, SnapshotModelRate> {
  const models = uniqueExistingAliases(snapshot.models)
  const index = new Map<string, SnapshotModelRate>()
  for (const model of models) {
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
  const id = modelId.trim()
  const direct = index.get(snapshotLookupKey(provider.trim(), id))
  if (direct) return direct
  const catalog = uniqueCatalogForKind(provider.trim())
  if (!catalog || catalog === provider.trim()) return undefined
  return index.get(snapshotLookupKey(catalog, id))
}

export { snapshotLookupKey } from "./alias-policy.ts"
