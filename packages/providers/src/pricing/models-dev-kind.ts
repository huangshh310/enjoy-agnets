/**
 * models.dev 供应商 id → 本仓 provider kind。
 * 只收能确定是单一官方按量价的目录。有国内/国际两份价，或按量/套餐两套主机的，先不映射
 *（带区域的定价以后另开一刀）。套餐目录（*-coding-plan、alibaba-token-plan）不映射。
 */
export const MODELS_DEV_KIND = {
  togetherai: "together"
} as const

export type ModelsDevProviderId = keyof typeof MODELS_DEV_KIND

/** 有套餐或订阅 region 的 kind：整类不用快照，除非用户自填单价。 */
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

export function kindHasPlanRegions(kind: string): boolean {
  return Boolean(PLAN_REGION_IDS[kind]?.length)
}
