/**
 * 模型能力矩阵单行卡片组件。
 */
import { RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { ModelOption } from "@renderer/stores/chat-store"
import { ModelBrandIcon } from "../providers/provider-icons"
import { useT } from "@renderer/i18n"
import { CapabilityBadge } from "./capability-badge"

export function ModelCapabilityRow({
  model,
  isDefault,
  onSetDefault
}: {
  model: ModelOption
  isDefault: boolean
  onSetDefault: (model: ModelOption) => void
}) {
  const t = useT()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-2 transition-colors hover:bg-background-secondary-hover/60 rounded-xl">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default p-1.5 shadow-2xs">
          <ModelBrandIcon
            modelId={model.id}
            providerKind={model.provider}
            apiStyle={model.apiStyle}
            size={18}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-caption-1-semibold text-text-primary">
              {model.label || model.id}
            </span>
            {model.providerName ? (
              <span className="shrink-0 rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-tertiary">
                {model.providerName}
              </span>
            ) : null}
          </div>
          <span className="truncate font-mono text-caption-2-regular text-text-tertiary">
            {model.id}
          </span>
        </div>
      </div>

      {/* 能力徽标组 */}
      <div className="flex flex-wrap items-center gap-1.5 max-w-[400px]">
        {(model.capabilities ?? []).map((cap) => (
          <CapabilityBadge key={cap} capability={cap} compact />
        ))}
      </div>

      {/* 设为默认操作 */}
      <div className="flex items-center gap-2 shrink-0">
        {isDefault ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-status-success-border bg-status-success-background px-2.5 py-1 text-caption-2-medium text-status-success-foreground">
            <RiCheckLine className="size-3.5" />
            <span>{t("settings.capabilities.activeDefault")}</span>
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSetDefault(model)}
            className="h-7 px-2.5 text-caption-2-medium cursor-pointer"
          >
            {t("settings.capabilities.setDefault")}
          </Button>
        )}
      </div>
    </div>
  )
}
