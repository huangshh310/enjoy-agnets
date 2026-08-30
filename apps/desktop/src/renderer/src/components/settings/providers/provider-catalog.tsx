/**
 * 供应商预设目录与自定义端点接入：
 * 顶部置顶醒目的“自定义 API 端点”快速接入区，
 * 下方为 Bento 风格的多协议厂商预设卡片网格，支持搜索与协议快速过滤。
 */
import { useMemo, useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiFlashlightLine,
  RiSearchLine,
  RiServerLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import {
  API_STYLE_OPTIONS,
  PROVIDER_PRESETS,
  type ApiStyle,
  type ProviderKind,
  type ProviderPreset
} from "@enjoy-agents/providers/presets"
import { SettingsCard } from "../settings-row"
import { ProviderIcon } from "./provider-icons"

export function ProviderCatalog({
  configuredKinds,
  hasProviders,
  onSelect
}: {
  configuredKinds: Set<string>
  hasProviders: boolean
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
    <div className="flex flex-col gap-6">
      {/* 顶部最显眼的自定义 API 端点快速接入 Banner */}
      <CustomGatewayBanner onSelect={onSelect} />

      {/* 主流大模型预设库 */}
      <SettingsCard
        title={hasProviders ? "Add from Official Presets" : "Available Presets"}
      >
        <div className="p-5 flex flex-col gap-4">
          {/* 筛选与搜索工具栏 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 协议 Tab 切换 */}
            <div className="flex items-center gap-1 rounded-xl bg-background-tertiary-default p-1 self-start sm:self-auto">
              <FilterTab
                label="All Providers"
                active={selectedProtocol === "all"}
                onClick={() => setSelectedProtocol("all")}
              />
              {API_STYLE_OPTIONS.map((opt) => (
                <FilterTab
                  key={opt.id}
                  label={opt.name.replace("OpenAI ", "").replace("Anthropic ", "")}
                  active={selectedProtocol === opt.id}
                  onClick={() => setSelectedProtocol(opt.id)}
                />
              ))}
            </div>

            {/* 快速搜索框 */}
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

          {/* 预设卡片网格：采用 3 列布局避免卡片过窄与标签换行 */}
          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {filteredPresets.map((preset) => (
                <PresetCard
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
                Try a different keyword or connect via Custom Endpoint.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  )
}

/** 显眼的自定义端点接入 Banner */
function CustomGatewayBanner({
  onSelect
}: {
  onSelect: (kind: ProviderKind, apiStyle: ApiStyle) => void
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-button-default bg-linear-to-br from-background-secondary-default/80 via-background-primary-default to-background-secondary-default/50 p-5 shadow-xs transition-all hover:border-border-button-hover">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default text-accent-600 shadow-xs">
            <RiServerLine className="size-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                Custom API Endpoint / Gateway
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-caption-1-semibold text-accent-600">
                <RiFlashlightLine className="size-3" />
                Recommended for Proxies
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-caption-1-medium text-text-secondary leading-relaxed">
              Connect any OneAPI, NewAPI, enterprise gateway, vLLM, or self-hosted endpoint compatible with OpenAI or Anthropic protocols.
            </p>
          </div>
        </div>

        {/* 快捷协议创建按钮组 */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSelect("custom", "anthropic")}
            className="rounded-xl border-border-button-default bg-background-primary-default text-text-primary hover:bg-background-secondary-hover"
          >
            <RiAddLine className="size-3.5 mr-1" />
            Anthropic Messages
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onSelect("custom", "openai")}
            className="rounded-xl"
          >
            <RiAddLine className="size-3.5 mr-1" />
            OpenAI /v1 Endpoint
          </Button>
        </div>
      </div>
    </section>
  )
}

function FilterTab({
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
          ? "bg-background-primary-default text-text-primary shadow-xs font-medium"
          : "text-text-tertiary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  )
}

function PresetCard({
  preset,
  isConfigured,
  onClick
}: {
  preset: ProviderPreset
  isConfigured: boolean
  onClick: () => void
}) {
  const protocolBadge =
    preset.kind === "ollama"
      ? "Local"
      : preset.apiStyle === "anthropic"
        ? "Messages"
        : preset.apiStyle === "openai-responses"
          ? "Responses"
          : "OpenAI /v1"

  const starterModel = preset.models[0]?.label ?? preset.models[0]?.id

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all outline-none",
        "border-border-button-default bg-background-primary-default",
        "hover:border-accent-500/50 hover:bg-background-secondary-hover/40 hover:shadow-card",
        "active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      )}
    >
      <div>
        {/* 卡片头部：图标与协议徽标（不换行） */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default/80 bg-background-secondary-default p-1.5 transition-all group-hover:bg-background-primary-default group-hover:scale-105 shadow-xs">
            <ProviderIcon kind={preset.kind} apiStyle={preset.apiStyle} size={22} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-state-success-text/10 px-2 py-0.5 text-caption-1-medium text-state-success-text font-medium whitespace-nowrap shrink-0">
                <RiCheckLine className="size-3" />
                Configured
              </span>
            ) : null}
            <span className="rounded-md border border-border-button-default/60 bg-background-tertiary-default/80 px-2 py-0.5 text-caption-1-medium text-text-tertiary whitespace-nowrap shrink-0">
              {protocolBadge}
            </span>
          </div>
        </div>

        {/* 供应商标题与描述 */}
        <div className="mt-3">
          <p className="text-body-medium font-semibold text-text-primary group-hover:text-accent-600 transition-colors">
            {preset.name}
          </p>
          <p className="mt-1 text-caption-1-medium text-text-tertiary line-clamp-2 leading-relaxed">
            {preset.description}
          </p>
        </div>
      </div>

      {/* 底部推荐模型与 Hover 引导 */}
      {starterModel ? (
        <div className="mt-3.5 pt-2.5 border-t border-separator-border/60 flex items-center justify-between text-caption-1-medium">
          <span className="truncate max-w-[160px] font-mono text-[11px] text-text-placeholder">
            {starterModel}
          </span>
          <span className="inline-flex items-center gap-0.5 text-caption-1-semibold text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {isConfigured ? "Add Profile" : "Connect"}
            <RiAddLine className="size-3.5" />
          </span>
        </div>
      ) : null}
    </button>
  )
}
