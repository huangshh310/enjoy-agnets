/**
 * 模型目录的一行：品牌标、id、启用、设为主模型、窗口，以及删除。
 */
import { RiCloseLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "./provider-icons"
import type { EditorModel } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderModelRow({
  model,
  kind,
  apiStyle,
  isPrimary,
  onPatch,
  onPrimary,
  onDelete
}: {
  model: EditorModel
  kind: string
  apiStyle: string
  isPrimary: boolean
  onPatch: (patch: Partial<EditorModel>) => void
  onPrimary: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        "flex flex-col gap-2 rounded-xl border px-2.5 py-2",
        isPrimary ? "border-accent-500/50 bg-accent-50/40" : "border-border-button-default"
      )}
    >
      <div className="flex items-center gap-2">
        <ModelBrandIcon modelId={model.id} providerKind={kind} apiStyle={apiStyle} size={16} />
        <span className="min-w-0 flex-1 truncate font-mono text-caption-1-medium text-text-primary">{model.id}</span>
        <button
          type="button"
          aria-pressed={model.enabled}
          onClick={() => onPatch({ enabled: !model.enabled })}
          className="rounded-lg border border-border-button-default px-2 py-0.5 text-caption-2-medium text-text-secondary"
        >
          {model.enabled ? t("settings.providers.modelEnabled") : t("settings.providers.disable")}
        </button>
        <button
          type="button"
          onClick={onPrimary}
          className="rounded-lg px-2 py-0.5 text-caption-2-medium text-accent-600"
        >
          {isPrimary ? t("settings.providers.primaryBadge") : t("settings.providers.setPrimary")}
        </button>
        <button
          type="button"
          aria-label={t("settings.providers.removeModel")}
          onClick={onDelete}
          className="inline-flex size-6 items-center justify-center text-text-tertiary hover:text-text-error-primary"
        >
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          value={model.contextWindow ?? ""}
          placeholder={t("settings.providers.contextShort")}
          aria-label={t("settings.providers.contextShort")}
          onChange={(event) => onPatch({ contextWindow: numberOrEmpty(event.target.value) })}
          className="h-8 font-mono text-caption-1-regular"
        />
        <Input
          type="number"
          value={model.maxOutputTokens ?? ""}
          placeholder={t("settings.providers.maxOutShort")}
          aria-label={t("settings.providers.maxOutShort")}
          onChange={(event) => onPatch({ maxOutputTokens: numberOrEmpty(event.target.value) })}
          className="h-8 font-mono text-caption-1-regular"
        />
      </div>
    </div>
  )
}

function numberOrEmpty(value: string): number | undefined {
  const next = value.trim()
  if (!next) return undefined
  const parsed = Number(next)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
