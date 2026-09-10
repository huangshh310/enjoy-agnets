/**
 * 可观测性舞台：fill 铺满剩余高度，视图在顶栏下换轨。
 */
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { ObservabilityDashboardView } from "./components/observability-dashboard-view"
import { ObservabilityModelRouting } from "./components/observability-model-routing"
import { ObservabilityPageHeader } from "./components/observability-page-header"
import { ObservabilityTraceModal } from "./components/observability-trace-modal"
import { ObservabilityTracesView } from "./components/observability-traces-view"
import { FullTraceWorkbench } from "./components/trace-view/full-trace-workbench"
import { ObservabilityCliUsageView } from "./components/cli-usage/observability-cli-usage-view"
import { ObservabilityReplay } from "./observability-replay"
import { useObservabilityPage } from "./use-observability-page"

export function ObservabilityPage() {
  const page = useObservabilityPage()

  return (
    <SecondaryPageShell
      searchPlaceholder={page.t("pages.observability.filterPlaceholder")}
      groups={page.groups}
      selectedId={page.activeView}
      onSelect={(id) => page.setActiveView(id as typeof page.activeView)}
      contentWidth="fill"
      hideChrome
    >
      <div className="flex h-full min-h-0 flex-col px-8 pt-5 pb-6">
        <ObservabilityPageHeader
          activeView={page.activeView}
          isRefreshing={page.isRefreshing}
          onRefresh={() => void page.refresh()}
          onViewChange={page.setActiveView}
        />
        <div className="flex min-h-0 flex-1 flex-col pt-4">
          {page.activeView === "dashboard" ? (
            <ObservabilityDashboardView metrics={page.metrics} />
          ) : null}
          {page.activeView === "routing" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ObservabilityModelRouting
                metrics={page.metrics}
                onSelectModelTrace={page.handleSelectModelTrace}
              />
            </div>
          ) : null}
          {page.activeView === "traces" ? (
            page.inspectMetric ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <FullTraceWorkbench
                  metric={page.inspectMetric}
                  onBack={() => page.setInspectMetric(null)}
                />
              </div>
            ) : (
              <ObservabilityTracesView
                metrics={page.paginatedMetrics}
                filteredTotal={page.filteredTotal}
                statusFilter={page.statusFilter}
                kindFilter={page.kindFilter}
                search={page.search}
                page={page.page}
                pageSize={page.pageSize}
                onStatusFilterChange={page.onStatusFilterChange}
                onKindFilterChange={page.onKindFilterChange}
                onSearchChange={page.onSearchChange}
                onPageChange={page.setPage}
                onPageSizeChange={(size) => {
                  page.setPageSize(size)
                  page.setPage(1)
                }}
                onInspect={page.setInspectMetric}
              />
            )
          ) : null}
          {page.activeView === "replay" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ObservabilityReplay />
            </div>
          ) : null}
          {page.activeView === "cliUsage" ? <ObservabilityCliUsageView usage={page.cliUsage} /> : null}
        </div>
        <ObservabilityTraceModal
          metric={page.inspectMetric}
          open={Boolean(page.inspectMetric)}
          onOpenChange={(open) => {
            if (!open) page.setInspectMetric(null)
          }}
        />
      </div>
    </SecondaryPageShell>
  )
}
