/**
 * Composer 模型菜单的一行：族标、名称和当前勾。
 */
import { RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import type { ModelOption } from "@renderer/stores/chat-store"

export function ComposerModelMenuRow({
  model,
  selected,
  videoLocked,
  onSelect
}: {
  model: ModelOption
  selected: boolean
  videoLocked: boolean
  onSelect: (model: ModelOption) => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      title={rowTitle(model, videoLocked, t("chat.videoLockedHint"))}
      onClick={() => onSelect(model)}
      className={cx(
        "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-caption-1-regular text-text-primary",
        "hover:bg-background-secondary-hover"
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <ModelBrandIcon
          modelId={`${model.id} ${model.label}`}
          providerKind={model.provider}
          apiStyle={model.apiStyle}
          size={16}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{model.label}</span>
      {videoLocked ? <span className="shrink-0 text-caption-2-medium text-text-tertiary">{t("chat.badgeExp")}</span> : null}
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden /> : null}
    </button>
  )
}

function rowTitle(model: ModelOption, videoLocked: boolean, lockedHint: string): string | undefined {
  if (videoLocked) return lockedHint
  return model.id.trim().toLowerCase() === model.label.trim().toLowerCase() ? undefined : model.id
}
