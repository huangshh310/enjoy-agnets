/**
 * 非 Chat 模块的情境栏：搜索 + 分组列表。
 */
import { RiCloseLine, RiSearchLine } from "@remixicon/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useT } from "@renderer/i18n"
import { useMemo } from "react"
import { filterModuleNavGroups } from "./filter-module-nav"
import { ModuleNavList } from "./module-nav-list"
import { useModuleNavStore } from "./module-nav-store"

export function ModuleNav() {
  const t = useT()
  const groups = useModuleNavStore((state) => state.groups)
  const selectedId = useModuleNavStore((state) => state.selectedId)
  const onSelect = useModuleNavStore((state) => state.onSelect)
  const query = useModuleNavStore((state) => state.searchValue ?? "")
  const onSearchChange = useModuleNavStore((state) => state.onSearchChange)
  const filterNav = useModuleNavStore((state) => state.filterNav)
  const placeholder = useModuleNavStore((state) => state.searchPlaceholder) ?? t("common.searchSettings")
  const visibleGroups = useMemo(
    () => filterModuleNavGroups(groups, query, filterNav),
    [filterNav, groups, query]
  )

  return (
    <div className="flex h-full min-h-0 flex-col px-2.5 py-2">
      <label className="relative mb-2.5 flex h-9 items-center gap-2 rounded-xl border border-border-button-default/60 bg-background-tertiary-default/80 px-3 focus-within:border-accent-500 focus-within:bg-background-primary-default focus-within:ring-2 focus-within:ring-accent-500/20">
        <RiSearchLine className="size-4 shrink-0 text-text-tertiary" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-caption-1-medium text-text-primary outline-none placeholder:text-text-tertiary"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onSearchChange?.("")}
            className="rounded p-0.5 text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiCloseLine className="size-3.5" />
          </button>
        ) : null}
      </label>
      <ScrollArea className="min-h-0 flex-1">
        <ModuleNavList groups={visibleGroups} selectedId={selectedId} onSelect={onSelect} />
      </ScrollArea>
    </div>
  )
}
