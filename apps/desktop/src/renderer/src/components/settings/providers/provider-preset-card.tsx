/**
 * 官方预设 Bento 卡片组件：展示厂商图标、协议标签、已配置状态及主模型列表。
 */
import { RiAddLine, RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { ProviderIcon } from "./provider-icons"
import { useT } from "@renderer/i18n"

export function ProviderPresetCard({
  preset,
  isConfigured,
  onClick
}: {
  preset: ProviderPreset
  isConfigured: boolean
  onClick: () => void
}) {
  const t = useT()
  const isAnthropic = preset.apiStyle === "anthropic"
  const isResponses = preset.apiStyle === "openai-responses"
  const protocolBadge = isAnthropic
    ? t("settings.providers.protocolMessages")
    : isResponses
      ? t("settings.providers.protocolResponses")
      : preset.kind === "ollama"
        ? t("settings.providers.protocolLocal")
        : t("settings.providers.protocolOpenai")

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all cursor-pointer outline-none",
        "border-border-button-default bg-background-primary-default shadow-xs",
        "hover:border-accent-500/50 hover:bg-background-secondary-hover/40 hover:shadow-md",
        "focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-border-focus-ring/20"
      )}
    >
      <div>
        {/* 顶部：图标与状态/协议徽标 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xs transition-transform group-hover:scale-105">
            <ProviderIcon kind={preset.kind} apiStyle={preset.apiStyle} size={22} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-state-success-text/10 px-2 py-0.5 text-caption-1-semibold text-state-success-text whitespace-nowrap shrink-0">
                <RiCheckLine className="size-3" />
                {t("settings.providers.configured")}
              </span>
            ) : null}

            <span className="rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary whitespace-nowrap shrink-0">
              {protocolBadge}
            </span>
          </div>
        </div>

        {/* 中部：名称与描述 */}
        <div className="mt-3">
          <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-600 transition-colors">
            {preset.name}
          </h4>
          <p className="mt-1 line-clamp-2 text-caption-1-medium text-text-secondary leading-normal">
            {preset.description}
          </p>
        </div>
      </div>

      {/* 底部：内置模型与快捷添加按钮 */}
      <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
        <span className="truncate font-mono text-[11px] text-text-tertiary max-w-[160px]">
          {preset.models[0]?.label || preset.models[0]?.id || t("settings.providers.customFallback")}
        </span>

        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption-1-medium font-medium text-text-secondary group-hover:bg-accent-500 group-hover:text-white transition-colors">
          <RiAddLine className="size-3.5" />
          <span>{isConfigured ? t("settings.providers.addProfile") : t("settings.providers.connect")}</span>
        </span>
      </div>
    </div>
  )
}
