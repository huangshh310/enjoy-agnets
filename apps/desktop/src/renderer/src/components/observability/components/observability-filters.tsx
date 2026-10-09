/**
 * 可观测性日志过滤与检索栏组件
 */
import { RiSearchLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import type { MetricKindFilter, MetricStatusFilter } from "../types/observability-ui.types"

function getStatusOptions(t: TranslateFn): Array<{ id: MetricStatusFilter; label: string }> {
  return [
    { id: "all", label: t("pages.observability.statusAll") },
    { id: "success", label: t("pages.observability.statusOk") },
    { id: "failed", label: t("pages.observability.statusFailed") },
    { id: "timeout", label: t("pages.observability.statusTimeout") },
    { id: "running", label: t("pages.observability.statusRunning") }
  ]
}

function getKindOptions(t: TranslateFn): Array<{ id: MetricKindFilter; label: string }> {
  return [
    { id: "all", label: t("pages.observability.kindAll") },
    { id: "agent", label: t("pages.observability.kindAgent") },
    { id: "stream", label: t("pages.observability.kindStream") },
    { id: "image", label: t("pages.observability.kindImage") },
    { id: "video", label: t("pages.observability.kindVideo") },
    { id: "embed", label: t("pages.observability.kindEmbed") }
  ]
}

export function ObservabilityFilters(props: {
  statusFilter: MetricStatusFilter
  onStatusFilterChange: (status: MetricStatusFilter) => void
  kindFilter: MetricKindFilter
  onKindFilterChange: (kind: MetricKindFilter) => void
  search: string
  onSearchChange: (val: string) => void
}) {
  const {
    statusFilter,
    onStatusFilterChange,
    kindFilter,
    onKindFilterChange,
    search,
    onSearchChange
  } = props
  const t = useT()

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* 状态过滤胶囊 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {getStatusOptions(t).map((opt) => {
            const isSelected = statusFilter === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusFilterChange(opt.id)}
                className={cx(
                  "rounded-md px-2.5 py-1 text-caption-2-medium font-medium transition-all shrink-0",
                  isSelected
                    ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-60 shrink-0">
          <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("pages.observability.searchModelRun")}
            className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default font-mono"
          />
        </div>
      </div>

      {/* 第二行：Kind 细分类型过滤 */}
      <div className="flex items-center gap-1 overflow-x-auto text-caption-2-medium text-text-tertiary">
        <span className="font-medium mr-1 text-text-secondary">
          {t("pages.observability.kindBreakdown")}
        </span>
        {getKindOptions(t).map((opt) => {
          const isSelected = kindFilter === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onKindFilterChange(opt.id)}
              className={cx(
                "rounded px-2 py-0.5 transition-colors shrink-0",
                isSelected
                  ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
