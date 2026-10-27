/**
 * 计费模型的每百万 token 单价。Ollama / LM Studio 整段不画。
 */
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import type { EditorModel } from "./providers.types"
import { visibleModelPriceFields, type ModelPriceField } from "./model-row-prices"

export function ProviderModelPriceFields({
  model,
  kind,
  onPatch
}: {
  model: EditorModel
  kind: string
  onPatch: (patch: Partial<EditorModel>) => void
}) {
  const fields = visibleModelPriceFields(kind)
  const t = useT()
  if (fields.length === 0) return null
  const hint = t("settings.providers.pricePerMillionHint")
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <PriceInput
          key={field.key}
          field={field}
          value={model[field.key]}
          label={t(`settings.providers.${field.label}`)}
          hint={hint}
          onPatch={onPatch}
        />
      ))}
    </div>
  )
}

function PriceInput({
  field,
  value,
  label,
  hint,
  onPatch
}: {
  field: ModelPriceField
  value: number | undefined
  label: string
  hint: string
  onPatch: (patch: Partial<EditorModel>) => void
}) {
  return (
    <Input
      type="number"
      step="any"
      min={0}
      value={value ?? ""}
      placeholder={label}
      aria-label={label}
      title={hint}
      onChange={(event) => onPatch(pricePatch(field.key, event.target.value))}
      className="h-8 font-mono text-caption-1-regular"
      {...(field.testId ? { "data-testid": field.testId } : {})}
    />
  )
}

const pricePatchers: Record<ModelPriceField["key"], (value: number | undefined) => Partial<EditorModel>> = {
  inputPricePerMillion: (value) => ({ inputPricePerMillion: value }),
  outputPricePerMillion: (value) => ({ outputPricePerMillion: value }),
  cacheReadPricePerMillion: (value) => ({ cacheReadPricePerMillion: value }),
  cacheWritePricePerMillion: (value) => ({ cacheWritePricePerMillion: value }),
  reasoningPricePerMillion: (value) => ({ reasoningPricePerMillion: value })
}

/** 空串清掉覆盖；0 保留（免费档）。非法数字丢掉。 */
function pricePatch(key: ModelPriceField["key"], raw: string): Partial<EditorModel> {
  return pricePatchers[key](priceOrEmpty(raw))
}

function priceOrEmpty(value: string): number | undefined {
  const next = value.trim()
  if (!next) return undefined
  const parsed = Number(next)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}
