/**
 * models.dev 供应商 id → 本仓 provider kind。只写核对过的精确对照，禁止按家族猜。
 * 编码套餐 / 中转目录（*-coding-plan、alibaba-token-plan 等）不映射。
 * 快照按 models.dev id 存两份目录（alibaba 与 alibaba-cn），不要按 kind 去重。
 */
export const MODELS_DEV_KIND = {
  alibaba: "qwen",
  "alibaba-cn": "qwen",
  moonshotai: "kimi",
  "moonshotai-cn": "kimi",
  zhipuai: "zhipu",
  togetherai: "together",
  volcengine: "doubao"
} as const

export type ModelsDevProviderId = keyof typeof MODELS_DEV_KIND

/** 核对过的 PAYG region → models.dev catalog。null = 套餐，不用快照。 */
export const REGION_SNAPSHOT_CATALOG: Record<string, Record<string, string | null>> = {
  qwen: { cn: "alibaba-cn", intl: "alibaba", "token-plan": null },
  kimi: { cn: "moonshotai-cn", intl: "moonshotai", "code-cn": null, "code-intl": null },
  zhipu: { api: "zhipuai", coding: null },
  doubao: { api: "volcengine", coding: null, agent: null }
}

const PLAN_REGION_IDS: Record<string, readonly string[]> = {
  qwen: ["token-plan"],
  kimi: ["code-cn", "code-intl"],
  zhipu: ["coding"],
  zai: ["coding"],
  doubao: ["coding", "agent"],
  wenxin: ["personal", "team"],
  stepfun: ["plan-cn", "plan-intl"],
  xiaomi: ["plan-cn", "plan-sgp", "plan-ams"]
}

export function kindFromModelsDevProvider(providerId: string): string | undefined {
  const id = providerId.trim()
  if (!id) return undefined
  return MODELS_DEV_KIND[id as ModelsDevProviderId]
}

export function catalogsForKind(kind: string): string[] {
  const mapped = Object.entries(MODELS_DEV_KIND)
    .filter(([, mappedKind]) => mappedKind === kind)
    .map(([id]) => id)
  return mapped.length > 0 ? mapped : [kind]
}

export function uniqueCatalogForKind(kind: string): string | undefined {
  const catalogs = catalogsForKind(kind)
  return catalogs.length === 1 ? catalogs[0] : undefined
}

export function kindNeedsExplicitRegion(kind: string): boolean {
  return catalogsForKind(kind).length > 1 || Boolean(PLAN_REGION_IDS[kind]?.length)
}

export function catalogForRegion(kind: string, regionId: string): string | null | undefined {
  if (PLAN_REGION_IDS[kind]?.includes(regionId)) return null
  const mapped = REGION_SNAPSHOT_CATALOG[kind]?.[regionId]
  if (mapped !== undefined) return mapped
  if (catalogsForKind(kind).length > 1) return undefined
  return uniqueCatalogForKind(kind)
}
