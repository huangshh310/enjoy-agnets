/**
 * 模型行要不要画单价。Ollama / LM Studio 本地不计费，整段不画。
 * custom 仍可填；推理单价只出现在计费行，留空仍按输出计。
 */
import { LOCAL_PRESET_KINDS } from "@renderer/lib/provider-official-domains"

export type ModelPriceField = {
  key:
    | "inputPricePerMillion"
    | "outputPricePerMillion"
    | "cacheReadPricePerMillion"
    | "cacheWritePricePerMillion"
    | "reasoningPricePerMillion"
  /** settings.providers 下的短标签。 */
  label:
    | "inputPriceShort"
    | "outputPriceShort"
    | "cacheReadPriceShort"
    | "cacheWritePriceShort"
    | "reasoningPriceShort"
  testId?: string
}

/** 计费行的五栏，顺序即网格从左到右、从上到下。 */
export const MODEL_PRICE_FIELDS: readonly ModelPriceField[] = [
  { key: "inputPricePerMillion", label: "inputPriceShort", testId: "provider-model-input-price" },
  { key: "outputPricePerMillion", label: "outputPriceShort", testId: "provider-model-output-price" },
  { key: "cacheReadPricePerMillion", label: "cacheReadPriceShort" },
  { key: "cacheWritePricePerMillion", label: "cacheWritePriceShort" },
  {
    key: "reasoningPricePerMillion",
    label: "reasoningPriceShort",
    testId: "provider-model-reasoning-price"
  }
]

/** 本地预设（Ollama / LM Studio）不画单价；custom 与云端仍画。 */
export function modelRowShowsPrices(kind: string): boolean {
  return !LOCAL_PRESET_KINDS.includes(kind)
}

/** 这一行实际要画的单价栏。本地预设返回空数组。 */
export function visibleModelPriceFields(kind: string): readonly ModelPriceField[] {
  return modelRowShowsPrices(kind) ? MODEL_PRICE_FIELDS : []
}
