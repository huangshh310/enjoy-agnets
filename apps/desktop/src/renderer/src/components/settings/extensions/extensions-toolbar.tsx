/**
 * 扩展中心交互工具栏：主 Tab 切换、分类药丸筛选、即时搜索输入框。
 */
import { RiCloseCircleLine, RiCpuLine, RiFlashlightLine, RiSearch2Line, RiSparklingLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ExtensionsCategoryFilter, ExtensionsFilterTab } from "./extensions.types.ts"

interface ExtensionsToolbarProps {
  activeTab: ExtensionsFilterTab
  onTabChange: (tab: ExtensionsFilterTab) => void
  activeCategory: ExtensionsCategoryFilter
  onCategoryChange: (category: ExtensionsCategoryFilter) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  mcpCount: number
  skillCount: number
  totalCount: number
}

export function ExtensionsToolbar({
  activeTab,
  onTabChange,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  mcpCount,
  skillCount,
  totalCount
}: ExtensionsToolbarProps) {
  const t = useT()

  const tabs: Array<{ id: ExtensionsFilterTab; label: string; count: number; icon: typeof RiSparklingLine }> = [
    { id: "all", label: t("settings.extensions.tabAll"), count: totalCount, icon: RiSparklingLine },
    { id: "mcp", label: t("settings.extensions.tabMcp"), count: mcpCount, icon: RiCpuLine },
    { id: "skills", label: t("settings.extensions.tabSkills"), count: skillCount, icon: RiFlashlightLine }
  ]

  const categories: Array<{ id: ExtensionsCategoryFilter; label: string }> = [
    { id: "all", label: t("settings.extensions.filterAll") },
    { id: "storage", label: t("settings.extensions.filterStorage") },
    { id: "dev", label: t("settings.extensions.filterDev") },
    { id: "database", label: t("settings.extensions.filterDatabase") },
    { id: "web", label: t("settings.extensions.filterWeb") },
    { id: "design", label: t("settings.extensions.filterDesign") },
    { id: "content", label: t("settings.extensions.filterContent") }
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* 上层：主 Tab 切换 + 搜索框 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab 胶囊组 */}
        <div className="inline-flex rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption-1-medium transition-all cursor-pointer",
                  selected
                    ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                <Icon className={cx("size-3.5", selected ? "text-accent-500" : "text-text-tertiary")} />
                <span>{tab.label}</span>
                <span
                  className={cx(
                    "ml-1 rounded-md px-1.5 py-0.2 font-mono text-[10px]",
                    selected
                      ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
                      : "bg-background-tertiary-default/60 text-text-tertiary"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-72">
          <RiSearch2Line className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("settings.extensions.searchPlaceholder")}
            className="h-9 w-full rounded-xl border border-separator-border/80 bg-background-primary-default pl-9 pr-8 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              <RiCloseCircleLine className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 下层：分类标签药丸列表 */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const selected = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={cx(
                "rounded-full px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer",
                selected
                  ? "bg-accent-500 text-white font-semibold shadow-xs"
                  : "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary border border-separator-border/60"
              )}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
