/**
 * 卡片额度：只认官方已用数字；多视窗时按当前模型匹配分组，取最紧的一条。
 */
import type { AgentToolQuotaInfo, ModelQuotaItem } from "@enjoy-agents/ipc-contract"

export function pickQuotaPercent(quota?: AgentToolQuotaInfo, selectedModel?: string): number | null {
  const fromUsed = clampPercent(quota?.usedPercent)
  if (fromUsed != null) return fromUsed
  return maxUsed(pickQuotaItems(quota?.modelQuotas, selectedModel))
}

export function pickQuotaWindow(quota?: AgentToolQuotaInfo, selectedModel?: string): string | undefined {
  if (quota?.usedPercent != null) return quota.windowType || quota.details
  const items = pickQuotaItems(quota?.modelQuotas, selectedModel)
  const tightest = items.reduce<ModelQuotaItem | undefined>((best, item) => {
    if (!best || item.percentage > best.percentage) return item
    return best
  }, undefined)
  return tightest?.displayName || quota?.windowType || quota?.details
}

export function formatQuotaPercent(percent: number | null): string {
  if (percent == null) return "—"
  return `${Math.round(percent)}%`
}

export function barWidth(percent: number | null): number {
  if (percent == null || percent <= 0) return 0
  return Math.min(100, Math.max(percent, 4))
}

function pickQuotaItems(models: ModelQuotaItem[] | undefined, selectedModel?: string): ModelQuotaItem[] {
  if (!models?.length) return []
  if (!selectedModel) return models
  return models.filter((item) => sameQuotaFamily(item, selectedModel))
}

function sameQuotaFamily(item: ModelQuotaItem, selectedModel: string): boolean {
  const model = selectedModel.toLowerCase()
  const hay = `${item.name} ${item.displayName}`.toLowerCase()
  if (model.includes("gemini")) return hay.includes("gemini")
  if (model.includes("claude")) return hay.includes("claude")
  if (model.startsWith("gpt") || model.includes("gpt-")) return hay.includes("gpt")
  return hay.includes(model)
}

function maxUsed(items: ModelQuotaItem[]): number | null {
  let max: number | null = null
  for (const item of items) {
    const n = clampPercent(item.percentage)
    if (n == null) continue
    if (max == null || n > max) max = n
  }
  return max
}

function clampPercent(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}
