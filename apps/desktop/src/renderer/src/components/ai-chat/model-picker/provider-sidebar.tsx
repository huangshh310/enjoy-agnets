/**
 * 双栏模型选择器 - 左侧供应商导航栏：
 * 展示已配置的各个供应商、模型数量统计、Active 状态，并支持快速切换。
 */
import { RiApps2Line, RiSettings3Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { ProviderIcon } from "@renderer/components/settings/providers/provider-icons"
import { type ProviderGroup } from "./model-picker-types"
import { useT } from "@renderer/i18n"

export function ProviderSidebar({
  groups,
  selectedKey,
  totalModelsCount,
  onSelectKey,
  onManageProviders
}: {
  groups: ProviderGroup[]
  selectedKey: string
  totalModelsCount: number
  onSelectKey: (key: string) => void
  onManageProviders: () => void
}) {
  const t = useT()
  return (
    <aside className="flex w-[190px] shrink-0 flex-col border-r border-separator-border bg-background-secondary-default/30">
      {/* 顶部供应商标题栏 */}
      <div className="flex h-10 items-center justify-between border-b border-separator-border px-3">
        <span className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase">
          {t("chat.providersCount", { count: groups.length })}
        </span>
      </div>

      {/* 供应商列表 */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {/* 全部模型快捷选项 */}
        <button
          type="button"
          onClick={() => onSelectKey("all")}
          className={cx(
            "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
            selectedKey === "all"
              ? "bg-background-primary-default font-medium text-text-primary shadow-xs ring-1 ring-border-button-default"
              : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          )}
        >
          <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-background-secondary-default text-text-secondary">
            <RiApps2Line className="size-3.5" />
          </div>
          <span className="flex-1 truncate text-[12px]">{t("chat.allModels")}</span>
          <span className="rounded-full bg-background-secondary-default px-1.5 py-0.2 text-[10px] font-medium text-text-tertiary">
            {totalModelsCount}
          </span>
        </button>

        {/* 各供应商条目 */}
        {groups.map((group) => {
          const isSelected = selectedKey === group.key
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onSelectKey(group.key)}
              className={cx(
                "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors group",
                isSelected
                  ? "bg-background-primary-default font-medium text-text-primary shadow-xs ring-1 ring-border-button-default"
                  : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              )}
            >
              <div className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border-button-default bg-background-primary-default p-0.5 shadow-2xs">
                <ProviderIcon
                  kind={group.provider}
                  name={group.providerName}
                  apiStyle={group.apiStyle}
                  size={14}
                />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-1">
                <span className="truncate text-[12px] font-medium leading-tight">
                  {group.providerName}
                </span>
                {group.active ? (
                  <span
                    title={t("chat.activeProvider")}
                    className="size-1.5 shrink-0 rounded-full bg-state-success-text"
                  />
                ) : null}
              </div>

              <span className="rounded-full bg-background-secondary-default px-1.5 py-0.2 text-[10px] font-medium text-text-tertiary">
                {group.models.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* 底部管理入口 */}
      <div className="border-t border-separator-border p-1.5">
        <button
          type="button"
          onClick={onManageProviders}
          className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiSettings3Line className="size-3.5 text-accent-500" />
          <span className="truncate">{t("chat.manageProviders")}</span>
        </button>
      </div>
    </aside>
  )
}
