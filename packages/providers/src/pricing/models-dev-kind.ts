/**
 * models.dev 供应商 id → 本仓 provider kind。只写核对过的精确对照，禁止按家族猜。
 * 编码套餐 / 中转目录（*-coding-plan、alibaba-token-plan 等）不映射。
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

export function kindFromModelsDevProvider(providerId: string): string | undefined {
  const id = providerId.trim()
  if (!id) return undefined
  return MODELS_DEV_KIND[id as ModelsDevProviderId]
}
