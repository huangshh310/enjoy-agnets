/**
 * 机架列表空态：已全部装好 / 无搜索结果 / 当前筛选为空。
 */
import type { ReactNode } from "react"
import { RiCheckboxCircleLine, RiFilter3Line, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function AgentToolsEmpty({
  kind,
  query,
  readyCount,
  total,
  onViewReady,
  onViewAll,
  onClearSearch
}: {
  kind: "ready" | "search" | "filter"
  query?: string
  readyCount: number
  total: number
  onViewReady: () => void
  onViewAll: () => void
  onClearSearch: () => void
}) {
  const t = useT()
  if (kind === "ready") {
    return (
      <EmptyShell
        icon={<RiCheckboxCircleLine className="size-6" />}
        title={t("settings.agentTools.emptyReady")}
        hint={t("settings.agentTools.emptyReadyHint")}
      >
        <Button type="button" size="sm" variant="outline" onClick={onViewReady}>
          {t("settings.agentTools.viewReady")} ({readyCount})
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onViewAll}>
          {t("settings.agentTools.viewAll")} ({total})
        </Button>
      </EmptyShell>
    )
  }
  if (kind === "search") {
    return (
      <EmptyShell
        icon={<RiSearchLine className="size-6" />}
        title={t("settings.agentTools.emptySearch", { query: query ?? "" })}
        hint={t("settings.agentTools.clearSearch")}
      >
        <Button type="button" size="sm" variant="outline" onClick={onClearSearch}>
          {t("settings.agentTools.clearSearch")}
        </Button>
      </EmptyShell>
    )
  }
  return (
    <EmptyShell
      icon={<RiFilter3Line className="size-6" />}
      title={t("settings.agentTools.emptyFilter")}
      hint={t("settings.agentTools.viewAll")}
    >
      <Button type="button" size="sm" variant="outline" onClick={onViewAll}>
        {t("settings.agentTools.viewAll")} ({total})
      </Button>
    </EmptyShell>
  )
}

function EmptyShell({
  icon,
  title,
  hint,
  children
}: {
  icon: ReactNode
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default p-10 text-center shadow-2xs">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-border-button-default bg-background-secondary-default text-text-tertiary">
        {icon}
      </span>
      <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary">{title}</h4>
      <p className="mt-1 max-w-sm text-caption-1-regular text-text-secondary">{hint}</p>
      <div className="mt-4 flex items-center gap-2">{children}</div>
    </div>
  )
}
