/**
 * 规则种类筛选条与搜索框。
 */
import { RiSearchLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getAgentKindFilters } from "./rules-kind"

export function RulesToolbar(props: {
  selectedKind: string
  onSelectKind: (id: string) => void
  search: string
  onSearch: (value: string) => void
}) {
  const t = useT()
  const filters = getAgentKindFilters(t)
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {filters.map((cat) => {
          const isSelected = props.selectedKind === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => props.onSelectKind(cat.id)}
              className={cx(
                "rounded-md px-2.5 py-1 text-caption-2-medium font-medium transition-all shrink-0",
                isSelected
                  ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
      <div className="relative w-full sm:w-56 shrink-0">
        <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder={t("studio.rules.searchPlaceholder")}
          className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
        />
      </div>
    </div>
  )
}
