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
  type ApiStyle,
  type ProviderKind
} from "@enjoy-agents/providers/presets"
import { SettingsCard } from "../settings-row"
import { ProviderCustomBanner } from "./provider-custom-banner"
import { ProviderPresetCard } from "./provider-preset-card"

export function ProviderPresetsTab({
  configuredKinds,
  onSelect
}: {
  configuredKinds: Set<string>
  onSelect: (kind: ProviderKind, apiStyle: ApiStyle) => void
}) {
  const [selectedProtocol, setSelectedProtocol] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPresets = useMemo(() => {
    return PROVIDER_PRESETS.filter((preset) => {
      if (preset.kind === "custom") return false

      const matchesProtocol =
        selectedProtocol === "all" || preset.apiStyle === selectedProtocol

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
    <div className="flex flex-col gap-5">
      {/* 顶部醒目的自定义 API 端点接入 Banner */}
      <ProviderCustomBanner onSelect={onSelect} />

      {/* 主流大模型官方预设卡片库 */}
      <SettingsCard title="Official Presets & Gateways">
        <div className="p-5 flex flex-col gap-4">
          {/* 工具栏：协议过滤与搜索框 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 协议筛选药丸 */}
            <div className="flex items-center gap-1 rounded-xl bg-background-tertiary-default p-1 self-start sm:self-auto">
              <FilterPill
                label={`All (${PROVIDER_PRESETS.filter((p) => p.kind !== "custom").length})`}
                active={selectedProtocol === "all"}
                onClick={() => setSelectedProtocol("all")}
              />
              {API_STYLE_OPTIONS.map((opt) => {
                const count = PROVIDER_PRESETS.filter(
                  (p) => p.kind !== "custom" && p.apiStyle === opt.id
                ).length
                return (
                  <FilterPill
                    key={opt.id}
                    label={`${opt.name.replace("OpenAI ", "").replace("Anthropic ", "")} (${count})`}
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
                placeholder="Search presets or models..."
                className="w-full rounded-xl border border-border-button-default bg-background-primary-default pl-9 pr-3 py-1.5 text-caption-1-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus-ring focus:ring-2 focus:ring-border-focus-ring/20 transition-all"
              />
            </div>
          </div>

          {/* 预设卡片网格 */}
          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {filteredPresets.map((preset) => (
                <ProviderPresetCard
                  key={preset.kind}
                  preset={preset}
                  isConfigured={configuredKinds.has(preset.kind)}
                  onClick={() => onSelect(preset.kind, preset.apiStyle)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-body-medium text-text-secondary">No presets match your search.</p>
              <p className="mt-1 text-caption-1-medium text-text-tertiary">
                Try a different keyword or connect via Custom Endpoint above.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  )
}

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
