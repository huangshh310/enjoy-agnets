/**
 * 双栏模型选择器 - 右侧模型搜索与选择面板：
 * 提供实时搜索、特性徽章（Fast / Thinking）、品牌图标与一键选择。
 */
import { useMemo } from "react"
import {
  RiBrainLine,
  RiCheckLine,
  RiFlashlightLine,
  RiSearchLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { isVideoOnlyModelId } from "@enjoy-agents/providers/capabilities"
import type { ModelOption } from "@renderer/stores/chat-store"
import type { ProviderGroup } from "./model-picker-types"

export function ModelListPane({
  selectedKey,
  groups,
  currentModelId,
  currentProviderId,
  searchQuery,
  onSearchChange,
  onSelectModel,
  experimentalMedia
}: {
  selectedKey: string
  groups: ProviderGroup[]
  currentModelId: string
  currentProviderId?: string
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectModel: (model: ModelOption) => void
  experimentalMedia: boolean
}) {
  // 当前供应商分组
  const currentGroup = useMemo(() => {
    if (selectedKey === "all") return null
    return groups.find((g) => g.key === selectedKey) ?? null
  }, [groups, selectedKey])

  // 所有待展示的模型（根据选中供应商或 All）
  const sourceModels = useMemo(() => {
    if (selectedKey === "all") {
      const all: ModelOption[] = []
      for (const g of groups) {
        for (const m of g.models) {
          if (!all.some((item) => item.id === m.id && item.providerId === m.providerId)) {
            all.push(m)
          }
        }
      }
      return all
    }
    return currentGroup?.models ?? []
  }, [selectedKey, currentGroup, groups])

  // 根据搜索关键字过滤模型
  const filteredModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return sourceModels
    return sourceModels.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.providerName && m.providerName.toLowerCase().includes(q)) ||
        m.provider.toLowerCase().includes(q)
    )
  }, [sourceModels, searchQuery])

  return (
    <section className="flex flex-1 flex-col bg-background-primary-default overflow-hidden">
      {/* 搜索栏 */}
      <div className="flex h-10 items-center gap-2 border-b border-separator-border px-3">
        <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            currentGroup
              ? `Search in ${currentGroup.providerName}...`
              : "Search models or ID..."
          }
          className="flex-1 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-placeholder"
        />
        {searchQuery ? (
          <span className="text-[10px] text-text-tertiary">
            {filteredModels.length} found
          </span>
        ) : null}
      </div>

      {/* 模型列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredModels.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center p-4">
            <span className="text-[12px] font-medium text-text-secondary">
              No models found
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5">
              {searchQuery
                ? `No models matching "${searchQuery}"`
                : "No models configured for this provider"}
            </span>
          </div>
        ) : (
          filteredModels.map((model) => {
            const isSelected =
              model.id === currentModelId &&
              (model.providerId && currentProviderId
                ? model.providerId === currentProviderId
                : true)
            const videoLocked = isVideoOnlyModelId(model.id) && !experimentalMedia

            return (
              <button
                key={`${model.providerId || model.provider}-${model.id}`}
                type="button"
                title={
                  videoLocked
                    ? "Experimental. Selecting this model will ask to enable experimental media."
                    : undefined
                }
                onClick={() => onSelectModel(model)}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-accent-50/70 text-text-primary dark:bg-accent-950/40 ring-1 ring-accent-500/20"
                    : "hover:bg-background-secondary-hover text-text-primary"
                )}
              >
                {/* 品牌图标 */}
                <div className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default p-0.5 shadow-2xs">
                  <ModelBrandIcon
                    modelId={model.id}
                    providerKind={model.provider}
                    apiStyle={model.apiStyle}
                    size={16}
                  />
                </div>

                {/* 模型名称与详情 */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">
                      {model.label}
                    </span>
                    {model.isFast ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-accent-50 px-1 py-0.2 text-[9px] font-semibold text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">
                        <RiFlashlightLine className="size-2.5" />
                        Fast
                      </span>
                    ) : null}
                    {model.isReasoning ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-state-success-text/10 px-1 py-0.2 text-[9px] font-semibold text-state-success-text">
                        <RiBrainLine className="size-2.5" />
                        Thinking
                      </span>
                    ) : null}
                    {videoLocked ? (
                      <span className="rounded bg-background-secondary-default px-1 py-0.2 text-[9px] font-semibold text-text-tertiary">
                        Exp
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="truncate font-mono text-[11px] text-text-tertiary">
                      {model.id}
                    </span>
                    {selectedKey === "all" && model.providerName ? (
                      <span className="rounded bg-background-secondary-default px-1 py-0.2 text-[9px] text-text-tertiary">
                        {model.providerName}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 选中对勾 */}
                {isSelected ? (
                  <RiCheckLine className="size-4 shrink-0 text-accent-500 ml-auto" />
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
