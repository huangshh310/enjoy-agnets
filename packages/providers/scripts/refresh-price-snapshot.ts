/**
 * 从 models.dev 重建离线单价快照。主路径不跑这个脚本、不联网。
 *
 * 用法（仓库根）：
 *   node --experimental-strip-types packages/providers/scripts/refresh-price-snapshot.ts
 *   node --experimental-strip-types packages/providers/scripts/refresh-price-snapshot.ts --expect-sha=<sha256>
 *
 * 规则：跳过 gateway / vercel / 本地；别名只留一对一且价目相同的 dated id；
 * models.dev id 经 `models-dev-kind.ts` 判断是否收录，快照里保留原 id
 *（alibaba 与 alibaba-cn 并存，禁止按本仓 kind 先到先得去重）。
 * 记下 cost.tiers 最低档上下文阈值。响应 ETag 与正文 SHA-256 写入快照。
 */
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { PROVIDER_KINDS } from "../src/presets/kinds.ts"
import { datedIdAliases, uniqueExistingAliases } from "../src/pricing/alias-policy.ts"
import { kindFromModelsDevProvider } from "../src/pricing/models-dev-kind.ts"
import type { SnapshotModelRate } from "../src/pricing/types.ts"

const MODELS_DEV = "https://models.dev/api.json"
const SKIP_KINDS = new Set(["gateway", "vercel", "ollama", "lmstudio", "custom"])

const allowed = new Set<string>(PROVIDER_KINDS.filter((kind) => !SKIP_KINDS.has(kind)))

type DevModel = {
  id?: string
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
    reasoning?: number
    tiers?: Array<{
      context?: number
      input?: number
      output?: number
      tier?: { type?: string; size?: number }
    }>
  }
}

const expectSha = readExpectSha(process.argv.slice(2))
const response = await fetch(MODELS_DEV)
if (!response.ok) throw new Error(`models.dev ${response.status}`)
const body = await response.text()
const etag = response.headers.get("etag")?.replaceAll('"', "") ?? undefined
const sourceSha256 = createHash("sha256").update(body).digest("hex")
assertExpectedSha(sourceSha256, expectSha)
const raw = JSON.parse(body) as Record<string, { models?: Record<string, DevModel> }>

const models: SnapshotModelRate[] = []
const seen = new Set<string>()
for (const [provider, pack] of Object.entries(raw)) {
  if (!includeProvider(provider)) continue
  for (const [modelId, model] of Object.entries(pack.models ?? {})) {
    const rate = toRate(provider, modelId, model)
    if (!rate) continue
    const key = `${provider}\0${rate.modelId}`
    if (seen.has(key)) continue
    seen.add(key)
    models.push(rate)
  }
}

const dated = uniqueExistingAliases(datedIdAliases(models))
const today = new Date().toISOString().slice(0, 10)
const snapshot = {
  version: today,
  date: today,
  source: "models.dev",
  sourceUrl: MODELS_DEV,
  ...(etag ? { sourceEtag: etag } : {}),
  sourceSha256,
  models: dated
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../src/pricing/models-dev-snapshot.json")
writeFileSync(out, `${JSON.stringify(snapshot)}\n`)
console.log(`wrote ${snapshot.models.length} models etag=${etag ?? "—"} → ${out}`)

export function readExpectSha(argv: string[]): string | undefined {
  const flag = argv.find((item) => item.startsWith("--expect-sha="))
  if (!flag) return undefined
  const value = flag.slice("--expect-sha=".length).trim()
  return value || undefined
}

export function assertExpectedSha(actual: string, expected?: string): void {
  if (!expected) return
  if (actual !== expected) {
    throw new Error(`models.dev sha256 ${actual} != --expect-sha ${expected}`)
  }
}

function includeProvider(modelsDevId: string): boolean {
  if (modelsDevId.includes("gateway")) return false
  if (allowed.has(modelsDevId)) return true
  const mapped = kindFromModelsDevProvider(modelsDevId)
  return Boolean(mapped && allowed.has(mapped))
}

function toRate(provider: string, modelId: string, model: DevModel): SnapshotModelRate | undefined {
  const cost = model.cost
  if (!cost) return undefined
  const input = finite(cost.input)
  const output = finite(cost.output)
  const cacheRead = finite(cost.cache_read)
  const cacheWrite = finite(cost.cache_write)
  const reasoning = finite(cost.reasoning)
  const tierContext = lowestTierContext(cost.tiers)
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
    ...(reasoning !== undefined ? { reasoning } : {}),
    ...(tierContext !== undefined ? { tierContext } : {})
  }
}

function lowestTierContext(
  tiers:
    | Array<{ context?: number; tier?: { size?: number } }>
    | undefined
): number | undefined {
  if (!tiers?.length) return undefined
  const thresholds = tiers
    .map((row) => finite(row.tier?.size) ?? finite(row.context))
    .filter((value): value is number => value !== undefined && value > 0)
  if (thresholds.length === 0) return undefined
  return Math.min(...thresholds)
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
}
