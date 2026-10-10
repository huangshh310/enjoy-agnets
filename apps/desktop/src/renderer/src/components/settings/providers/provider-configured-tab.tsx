/**
 * 已配置服务商视图 (Configured Providers Tab)：
 * 支持搜索过滤、概览状态、列表卡片展示以及无配置时的精美 Empty State 引导。
 */
import { useMemo, useState } from "react"
import {
  RiAddLine,
  RiCompass3Line,
  RiPulseLine,
  RiSearchLine,
  RiServerLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { AgentBindRef, ProviderPublic } from "@enjoy-agents/ipc-contract"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"
import { SettingsCard } from "../settings-row"
import { ProviderConfiguredMetrics } from "./provider-configured-metrics"
import { ProviderIcon } from "./provider-icons"
import { ProviderList } from "./provider-list"
import type { PingStateMap } from "./use-provider-settings"
import { useT } from "@renderer/i18n"
export function ProviderConfiguredTab({
  providers,
  pingStates,
  onPing,
  onPingAll,
  onEdit,
  onActivate,
  onRemove,
  onDuplicate,
  onSetEnabled,
  onAddCustom,
  onExplorePresets,
  refsByProvider,
  onOpenAgent
}: {
  providers: ProviderPublic[]
  pingStates?: PingStateMap
  onPing?: (profile: ProviderPublic) => void
  onPingAll?: () => void
  onEdit: (profile: ProviderPublic) => void
  onActivate: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (profile: ProviderPublic) => void
  onSetEnabled: (id: string, enabled: boolean) => void
  onAddCustom: (kind: ProviderKind, apiStyle: ApiStyle) => void
  onExplorePresets: () => void
  refsByProvider?: Record<string, AgentBindRef[]>
  onOpenAgent?: (runtimeId: string) => void
}) {
  const t = useT()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return providers
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.modelId.toLowerCase().includes(q) ||
        p.baseURL.toLowerCase().includes(q) ||
        p.kind.toLowerCase().includes(q) ||
        p.apiStyle.toLowerCase().includes(q)
    )
  }, [providers, searchQuery])

  if (providers.length === 0) {
    return (
      <EmptyConfiguredState
        onAddCustom={onAddCustom}
        onExplorePresets={onExplorePresets}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部概览指标与快捷过滤栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2.5 shadow-xs">
        <ProviderConfiguredMetrics providers={providers} />

        {/* 右侧搜索框与快速添加 */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <RiSearchLine className="size-3.5 absolute left-3 top-2.5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("settings.providers.filterPlaceholder")}
              className="w-full rounded-xl border border-border-button-default bg-background-secondary-default/50 pl-8 pr-3 py-1.5 text-caption-1-medium text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus-ring focus:bg-background-primary-default focus:ring-2 focus:ring-border-focus-ring/20 transition-all"
            />
          </div>

          {onPingAll && providers.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPingAll}
              className="rounded-xl border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary shrink-0"
              title={t("settings.providers.pingAllTitle")}
            >
              <RiPulseLine className="size-3.5 mr-1 text-accent-500" />
              {t("settings.providers.testSpeed")}
            </Button>
          ) : null}

          <Button
            type="button"
            size="sm"
            onClick={onExplorePresets}
            className="rounded-xl shrink-0"
          >
            <RiAddLine className="size-3.5 mr-1" />
            {t("settings.providers.addProvider")}
          </Button>
        </div>
      </div>

      {/* 已配置 Provider 列表 */}
      <SettingsCard dense title={t("settings.providers.configuredCount", { count: filteredProviders.length })}>
        <ProviderList
          providers={filteredProviders}
          pingStates={pingStates}
          refsByProvider={refsByProvider}
          onPing={onPing}
          onEdit={onEdit}
          onActivate={onActivate}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onSetEnabled={onSetEnabled}
          onOpenAgent={onOpenAgent}
        />
      </SettingsCard>
    </div>
  )
}

function EmptyConfiguredState({
  onAddCustom,
  onExplorePresets
}: {
  onAddCustom: (kind: ProviderKind, apiStyle: ApiStyle) => void
  onExplorePresets: () => void
}) {
  const t = useT()
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-border-button-default bg-background-primary-default px-8 py-12 text-center shadow-xs">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 shadow-xs dark:bg-accent-950/50 dark:text-accent-300">
        <RiCompass3Line className="size-8" />
      </div>

      <h3 className="mt-4 text-title-3-semibold text-text-primary">
        {t("settings.providers.emptyTitle")}
      </h3>
      <p className="mt-1.5 max-w-md text-body-medium text-text-secondary leading-relaxed">
        {t("settings.providers.emptyDesc")}
      </p>

      {/* 快捷接入操作 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={onExplorePresets}
          className="rounded-xl px-5 py-2.5 font-medium shadow-xs"
        >
          <RiAddLine className="size-4 mr-1.5" />
          {t("settings.providers.browsePresets")}
        </Button>

        <Button
          type="button"
          variant="outline"
          data-testid="provider-add-custom"
          onClick={() => onAddCustom("custom", "openai")}
          className="rounded-xl px-4 py-2.5"
        >
          <RiServerLine className="size-4 mr-1.5 text-accent-500" />
          {t("settings.providers.addCustom")}
        </Button>
      </div>

      {/* 常见推荐卡片推荐 */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-caption-1-medium text-text-tertiary">
        <span>{t("settings.providers.popular")}</span>
        <button
          type="button"
          onClick={() => onAddCustom("deepseek", "openai")}
          className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default/60 px-2.5 py-1 text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
        >
          <ProviderIcon kind="deepseek" size={14} />
          DeepSeek
        </button>
        <button
          type="button"
          onClick={() => onAddCustom("openai", "openai")}
          className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default/60 px-2.5 py-1 text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
        >
          <ProviderIcon kind="openai" size={14} />
          OpenAI
        </button>
        <button
          type="button"
          onClick={() => onAddCustom("anthropic", "anthropic")}
          className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default/60 px-2.5 py-1 text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
        >
          <ProviderIcon kind="anthropic" size={14} />
          Claude
        </button>
      </div>
    </div>
  )
}
