/**
 * models.dev 供应商 id → 本仓 provider kind。
 * 只收能确定是单一官方按量价、且与 preset 同站的目录。
 * 有国内/国际两份价或按量/套餐两套主机的不映射（带区域的定价以后另开一刀）。
 * siliconflow 用国内站 siliconflow-cn，不用国际站 siliconflow。
 */
export const MODELS_DEV_KIND = {
  togetherai: "together",
  "siliconflow-cn": "siliconflow"
} as const

export type ModelsDevProviderId = keyof typeof MODELS_DEV_KIND

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
