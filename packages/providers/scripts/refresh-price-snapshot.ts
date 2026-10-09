/**
 * 从 models.dev 重建离线单价快照。主路径不跑这个脚本、不联网。
 *
 * 用法（仓库根）：
 *   node --experimental-strip-types packages/providers/scripts/refresh-price-snapshot.ts
 *
 * 规则：跳过 gateway / vercel；别名只留一对一且真实存在的 dated id；不写 family。
 */
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROVIDER_KINDS } from "../src/presets/kinds.ts"
import { datedIdAliases, uniqueExistingAliases } from "../src/pricing/alias-policy.ts"
import type { SnapshotModelRate } from "../src/pricing/types.ts"

const MODELS_DEV = "https://models.dev/api.json"
const SKIP_PROVIDERS = new Set(["gateway", "vercel", "ollama", "lmstudio", "custom"])

const allowed = new Set<string>(PROVIDER_KINDS.filter((kind) => !SKIP_PROVIDERS.has(kind)))

type DevModel = {
  id?: string
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
    reasoning?: number
  }
}

const raw = (await (await fetch(MODELS_DEV)).json()) as Record<string, { models?: Record<string, DevModel> }>
const models: SnapshotModelRate[] = []
for (const [provider, pack] of Object.entries(raw)) {
  if (!allowed.has(provider) || provider.includes("gateway")) continue
  for (const [modelId, model] of Object.entries(pack.models ?? {})) {
    const rate = toRate(provider, modelId, model)
    if (rate) models.push(rate)
  }
}

const dated = uniqueExistingAliases(datedIdAliases(models))
const today = new Date().toISOString().slice(0, 10)
const snapshot = {
  version: today,
  date: today,
  source: "models.dev",
  models: dated
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../src/pricing/models-dev-snapshot.json")
writeFileSync(out, `${JSON.stringify(snapshot)}\n`)
console.log(`wrote ${snapshot.models.length} models → ${out}`)

function toRate(provider: string, modelId: string, model: DevModel): SnapshotModelRate | undefined {
  const cost = model.cost
  if (!cost) return undefined
  const input = finite(cost.input)
  const output = finite(cost.output)
  const cacheRead = finite(cost.cache_read)
  const cacheWrite = finite(cost.cache_write)
  const reasoning = finite(cost.reasoning)
  if (
    input === undefined &&
    output === undefined &&
    cacheRead === undefined &&
    cacheWrite === undefined &&
    reasoning === undefined
  ) {
    return undefined
  }
  return {
    provider,
    modelId: model.id?.trim() || modelId,
    ...(input !== undefined ? { input } : {}),
    ...(output !== undefined ? { output } : {}),
    ...(cacheRead !== undefined ? { cacheRead } : {}),
    ...(cacheWrite !== undefined ? { cacheWrite } : {}),
    ...(reasoning !== undefined ? { reasoning } : {})
  }
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
}
