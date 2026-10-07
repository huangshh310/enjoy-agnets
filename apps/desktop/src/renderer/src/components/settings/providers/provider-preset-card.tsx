/**
 * 官方预设 Bento 卡片组件：展示厂商图标、协议标签、已配置状态及主模型列表。
 */
import { RiAddLine, RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { supportedApiStylesFor, type ApiStyle, type ProviderPreset } from "@enjoy-agents/providers/presets"
import { presetBlurb } from "./provider-blurb"
import { ProviderIcon } from "./provider-icons"
import { WIRE_LABEL } from "./provider-wire-lines"
import { useT } from "@renderer/i18n"

export function ProviderPresetCard({
  preset,
  isConfigured,
  activeProtocol,
  onClick,
  onSelectProtocol
}: {
  preset: ProviderPreset
  isConfigured: boolean
  activeProtocol?: ApiStyle
  onClick: () => void
  onSelectProtocol?: (style: ApiStyle) => void
}) {
  const styles = supportedApiStylesFor(preset)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => onCardKey(event, onClick)}
      className={CARD_CLASS}
    >
      <PresetCardBody
        preset={preset}
        styles={styles}
        isConfigured={isConfigured}
        activeProtocol={activeProtocol}
        onSelectProtocol={onSelectProtocol}
      />
    </div>
  )
}

const CARD_CLASS = cx(
  "group relative flex flex-col rounded-xl border p-3 text-left transition-colors cursor-pointer outline-none",
  "border-border-button-default bg-background-primary-default shadow-xs",
  "hover:border-accent-500/50 hover:bg-background-secondary-hover/40 hover:shadow-md",
  "focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-border-focus-ring/20"
)

function onCardKey(event: { key: string; preventDefault: () => void }, onClick: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  onClick()
}

function PresetCardBody({
  preset,
  styles,
  isConfigured,
  activeProtocol,
  onSelectProtocol
}: {
  preset: ProviderPreset
  styles: readonly ApiStyle[]
  isConfigured: boolean
  activeProtocol?: ApiStyle
  onSelectProtocol?: (style: ApiStyle) => void
}) {
  const t = useT()
  const sample = preset.models[0]?.label || preset.models[0]?.id || t("settings.providers.customFallback")
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default p-0.5 shadow-xs">
          <ProviderIcon kind={preset.kind} apiStyle={activeProtocol ?? preset.apiStyle} size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-caption-1-semibold text-text-primary group-hover:text-accent-600">
              {preset.name}
            </h4>
            {isConfigured ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-state-success-text/10 px-1.5 py-0 text-caption-2-medium text-state-success-text">
                <RiCheckLine className="size-3" />
                {t("settings.providers.configured")}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-caption-2-medium text-text-secondary">
            {presetBlurb(preset.kind, preset.description, t)}
          </p>
        </div>
      </div>
      <ProtocolChips styles={styles} activeProtocol={activeProtocol} onSelectProtocol={onSelectProtocol} />
      <div className="mt-2 flex items-center justify-between border-t border-separator-border/60 pt-1.5">
        <span className="max-w-[140px] truncate font-mono text-caption-2-regular text-text-tertiary">{sample}</span>
        <span className="inline-flex items-center gap-0.5 text-caption-2-medium text-text-secondary group-hover:text-accent-600">
          <RiAddLine className="size-3" />
          <span>{isConfigured ? t("settings.providers.addProfile") : t("settings.providers.connect")}</span>
        </span>
      </div>
    </>
  )
}

function ProtocolChips({
  styles,
  activeProtocol,
  onSelectProtocol
}: {
  styles: readonly ApiStyle[]
  activeProtocol?: ApiStyle
  onSelectProtocol?: (style: ApiStyle) => void
}) {
  const t = useT()
  if (styles.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {styles.map((style) => {
        const highlighted = activeProtocol === style
        return (
          <span
            key={style}
            role={onSelectProtocol ? "button" : undefined}
            tabIndex={onSelectProtocol ? 0 : undefined}
            onClick={(event) => {
              if (!onSelectProtocol) return
              event.stopPropagation()
              onSelectProtocol(style)
            }}
            className={cx(
              "rounded-md border px-2 py-0.5 text-caption-2-medium font-medium transition-all",
              highlighted
                ? "border-accent-500/50 bg-accent-500/10 font-semibold text-accent-600 shadow-2xs"
                : "border-border-button-default bg-background-secondary-default text-text-tertiary",
              onSelectProtocol ? "hover:border-accent-400 hover:text-accent-600" : ""
            )}
          >
            {t(`settings.providers.${WIRE_LABEL[style]}`)}
          </span>
        )
      })}
    </div>
  )
}
