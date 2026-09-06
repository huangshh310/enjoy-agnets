/**
 * 链路明细：过滤条固定，列表吃剩余高度，分页贴底。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { MetricKindFilter, MetricStatusFilter } from "../types/observability-ui.types"
import { ObservabilityFilters } from "./observability-filters"
import { ObservabilityMetricsList } from "./observability-metrics-list"
import { ObservabilityPagination } from "./observability-pagination"

export function ObservabilityTracesView(props: {
  metrics: TelemetryMetric[]
  filteredTotal: number
  statusFilter: MetricStatusFilter
  kindFilter: MetricKindFilter
  search: string
  page: number
  pageSize: number
  onStatusFilterChange: (value: MetricStatusFilter) => void
  onKindFilterChange: (value: MetricKindFilter) => void
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onInspect: (metric: TelemetryMetric) => void
}) {
  const t = useT()
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ObservabilityFilters
        statusFilter={props.statusFilter}
        onStatusFilterChange={props.onStatusFilterChange}
        kindFilter={props.kindFilter}
        onKindFilterChange={props.onKindFilterChange}
        search={props.search}
        onSearchChange={props.onSearchChange}
      />
      <div className="flex items-center justify-between px-1 text-caption-2-medium text-text-tertiary">
        <span>
          {t("pages.observability.pageShowing", {
            n: props.metrics.length,
            total: props.filteredTotal
          })}
        </span>
        <span>{t("pages.observability.clickTrace")}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ObservabilityMetricsList metrics={props.metrics} onInspect={props.onInspect} />
      </div>
      <div className="shrink-0 pt-2">
        <ObservabilityPagination
          currentPage={props.page}
          pageSize={props.pageSize}
          totalItems={props.filteredTotal}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
          pageSizeOptions={[10, 15, 20, 50]}
        />
      </div>
    </section>
  )
}
