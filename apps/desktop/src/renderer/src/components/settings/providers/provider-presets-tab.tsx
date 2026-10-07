/**
 * 预设市场视图 (Presets & Marketplace Tab)：
 * 包含置顶自定义端点 Banner、协议分类过滤 Tab、实时搜索与 Bento 预设卡片网格。
 */
import { useMemo, useState } from "react"
import { RiSearchLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import {
  API_STYLE_OPTIONS,
  PROVIDER_PRESETS,
  supportedApiStylesFor,
  type ApiStyle,
  type ProviderKind
} from "@enjoy-agents/providers/presets"
import { SettingsCard } from "../settings-row"
import { ProviderCustomBanner } from "./provider-custom-banner"
import { ProviderPresetCard } from "./provider-preset-card"
import { WIRE_LABEL } from "./provider-wire-lines"
import { useT } from "@renderer/i18n"

export function ProviderPresetsTab({
  configuredKinds,
  onSelect
}: {
  configuredKinds: Set<string>
  onSelect: (kind: ProviderKind, apiStyle: ApiStyle) => void
}) {
  const t = useT()
  const [selectedProtocol, setSelectedProtocol] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPresets = useMemo(() => {
    return PROVIDER_PRESETS.filter((preset) => {
      if (preset.kind === "custom") return false

      const styles = supportedApiStylesFor(preset)
      const matchesProtocol =
        selectedProtocol === "all" || styles.includes(selectedProtocol as ApiStyle)

      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.models.some(
          (m) =>
            m.id.toLowerCase().includes(query) || m.label.toLowerCase().includes(query)
        )

      return matchesProtocol && matchesSearch
    })
  }, [selectedProtocol, searchQuery])

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部醒目的自定义 API 端点接入 Banner */}
      <ProviderCustomBanner onSelect={onSelect} />

      {/* 主流大模型官方预设卡片库 */}
      <SettingsCard dense title={t("settings.providers.official")}>
        <div className="flex flex-col gap-3 p-3">
          {/* 工具栏：协议过滤与搜索框 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 协议筛选药丸 */}
            <div className="flex items-center gap-1 rounded-xl bg-background-tertiary-default p-1 self-start sm:self-auto">
              <FilterPill
                label={t("settings.providers.allCount", { count: PROVIDER_PRESETS.filter((p) => p.kind !== "custom").length })}
                active={selectedProtocol === "all"}
                onClick={() => setSelectedProtocol("all")}
              />
              {API_STYLE_OPTIONS.map((opt) => {
                const count = PROVIDER_PRESETS.filter(
                  (p) =>
                    p.kind !== "custom" &&
                    supportedApiStylesFor(p).includes(opt.id as ApiStyle)
                ).length
                return (
                  <FilterPill
                    key={opt.id}
                    label={`${t(`settings.providers.${WIRE_LABEL[opt.id]}`)} (${count})`}
                    active={selectedProtocol === opt.id}
                    onClick={() => setSelectedProtocol(opt.id)}
                  />
                )
              })}
            </div>

            {/* 预设搜索输入框 */}
            <div className="relative w-full sm:w-64">
              <RiSearchLine className="size-4 absolute left-3 top-2.5 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("settings.providers.searchPresets")}
                className="w-full rounded-xl border border-border-button-default bg-background-primary-default pl-9 pr-3 py-1.5 text-caption-1-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus-ring focus:ring-2 focus:ring-border-focus-ring/20 transition-all"
              />
            </div>
          </div>

          {/* 预设卡片网格 */}
          {filteredPresets.length > 0 ? (
            <div className="flex flex-col gap-4 pt-1">
              {PRESET_GROUPS.map((group) => {
                const items = filteredPresets.filter((preset) => preset.group === group)
                if (items.length === 0) return null
                return (
                  <section key={group} className="flex flex-col gap-1.5">
                    <h3 className="text-caption-1-semibold text-text-secondary">
                      {t(`settings.providers.group_${group}`)}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                      {items.map((preset) => {
                        const styles = supportedApiStylesFor(preset)
                        const targetStyle =
                          selectedProtocol !== "all" && styles.includes(selectedProtocol as ApiStyle)
                            ? (selectedProtocol as ApiStyle)
                            : preset.apiStyle
                        return (
                          <ProviderPresetCard
                            key={preset.kind}
                            preset={preset}
                            activeProtocol={selectedProtocol !== "all" ? (selectedProtocol as ApiStyle) : undefined}
                            isConfigured={configuredKinds.has(preset.kind)}
                            onClick={() => onSelect(preset.kind, targetStyle)}
                            onSelectProtocol={(style) => onSelect(preset.kind, style)}
                          />
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-body-medium text-text-secondary">{t("settings.providers.noPresets")}</p>
              <p className="mt-1 text-caption-1-medium text-text-tertiary">
                {t("settings.providers.noPresetsHint")}
              </p>
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  )
}

const PRESET_GROUPS = ["vendor", "relay", "local", "media"] as const

function FilterPill({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-3 py-1 text-caption-1-medium transition-all outline-none",
        active
          ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
          : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover/60"
      )}
    >
      {label}
    </button>
  )
}
