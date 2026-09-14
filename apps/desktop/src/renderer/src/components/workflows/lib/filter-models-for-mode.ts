/**
 * 按画布节点模态过滤模型列表。没有匹配时回退全部，避免空选择器。
 */
import type { CanvasGenerationMode } from "./canvas.types"

export type CapabilityModel = {
  id: string
  capabilities?: string[]
  staticCaps?: string[]
}

export function filterModelsForMode<T extends CapabilityModel>(
  models: T[],
  mode: CanvasGenerationMode
): T[] {
  const cap = mode === "audio" ? "speech" : mode
  const matched = models.filter((model) => {
    const caps = model.capabilities ?? model.staticCaps ?? []
    if (caps.length === 0) return mode === "text"
    return caps.includes(cap)
  })
  return matched.length > 0 ? matched : models
}
