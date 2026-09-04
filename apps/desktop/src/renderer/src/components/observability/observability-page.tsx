/**
 * Observability & Telemetry 可观测性与遥测大盘页面：
 * 采用专业 APM 仪表盘架构，全屏响应式自适应布局 (contentWidth="stage")，
 * 提供时序耗时趋势、Token 吞吐波动、工作负载占比、延迟分位数直方图、
 * 模型性能分布、状态健康 Donut 环形图、带分页的链路明细与事件回放。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiDashboardLine,
  RiFileHistoryLine,
  RiFileList3Line,
  RiPulseLine,
  RiRefreshLine,
  RiRouteLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ObservabilityHistogramChart } from "./components/observability-charts-histogram"
import { ObservabilityKindChart } from "./components/observability-charts-kind"
import { ObservabilityModelsChart } from "./components/observability-charts-models"
import { ObservabilityStatusChart } from "./components/observability-charts-status"
import { ObservabilityThroughputChart } from "./components/observability-charts-throughput"
import { ObservabilityTimelineChart } from "./components/observability-charts-timeline"
import { ObservabilityFilters } from "./components/observability-filters"
import { ObservabilityKpiBar } from "./components/observability-kpi-bar"
import { ObservabilityMetricsList } from "./components/observability-metrics-list"
import { ObservabilityPagination } from "./components/observability-pagination"
import { ObservabilityPolicyBar } from "./components/observability-policy-bar"
import { ObservabilityTraceModal } from "./components/observability-trace-modal"
import { FullTraceWorkbench } from "./components/trace-view/full-trace-workbench"
import { ObservabilityModelRouting } from "./components/observability-model-routing"
import { ObservabilityReplay } from "./observability-replay"
import {
  getAdaptivePageSize,
  type MetricKindFilter,
  type MetricStatusFilter
} from "./types/observability-ui.types"
import { useChatStore } from "@renderer/stores/chat-store"

type ActiveObservabilityView = "dashboard" | "routing" | "traces" | "replay"
export function ObservabilityPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<ActiveObservabilityView>("dashboard")
  const storeModels = useChatStore((state) => state.models)
  const [statusFilter, setStatusFilter] = useState<MetricStatusFilter>("all")
  const [kindFilter, setKindFilter] = useState<MetricKindFilter>("all")
  const [search, setSearch] = useState("")
  const [inspectMetric, setInspectMetric] = useState<TelemetryMetric | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => getAdaptivePageSize())

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 200 }) as Promise<TelemetryMetric[]>
  })
  const metrics = metricsQuery.data ?? []
  const isRefreshing = metricsQuery.isFetching

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["metrics"] })
  }

  // 侧边栏导航分组：全面涵盖本地执行指标、模型路由大盘、链路明细与事件回放
  const routedModelCount = storeModels.length || 10
  const groups = useMemo(
    () => [
      {
        id: "metrics",
        label: t("pages.observability.navGroup") || "遥测与日志",
        items: [
          {
            id: "dashboard",
            label: t("pages.observability.navLocal") || "本地执行监控",
            icon: RiPulseLine,
            meta: String(metrics.length)
          },
          {
            id: "routing",
            label: t("pages.observability.navRouting") || "模型路由",
            icon: RiRouteLine,
            meta: String(routedModelCount)
          },
          {
            id: "traces",
            label: t("pages.observability.viewTraces") || "链路明细日志",
            icon: RiFileList3Line
          },
          {
            id: "replay",
            label: t("pages.observability.viewReplay") || "事件流回放",
            icon: RiFileHistoryLine
          }
        ]
      }
    ],
    [metrics.length, routedModelCount, t]
  )

  function handleSelectModelTrace(modelId: string) {
    setSearch(modelId)
    setActiveView("traces")
    setPage(1)
  }

  // 客户端过滤
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      // 状态筛选
      if (statusFilter === "success") {
        if (!(m.status === "success" || m.status === "completed" || m.status === "ok")) return false
      } else if (statusFilter === "failed") {
        if (
          m.status === "success" ||
          m.status === "completed" ||
          m.status === "ok" ||
          m.status === "running"
        ) {
          return false
        }
      } else if (statusFilter === "timeout") {
        if (m.errorClass !== "timeout") return false
      } else if (statusFilter === "running") {
        if (m.status !== "running") return false
      }

      // Kind 筛选
      if (kindFilter !== "all") {
        if (!m.kind.toLowerCase().includes(kindFilter.toLowerCase())) return false
      }

      // 关键词筛选
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchModel = m.modelId?.toLowerCase().includes(query)
        const matchRun = m.runId.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
        const matchKind = m.kind.toLowerCase().includes(query)
        if (!matchModel && !matchRun && !matchKind) return false
      }

      return true
    })
  }, [metrics, statusFilter, kindFilter, search])

  // 分页切片
  const paginatedMetrics = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredMetrics.slice(start, start + pageSize)
  }, [filteredMetrics, page, pageSize])

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.observability.filterPlaceholder")}
      groups={groups}
      selectedId={activeView}
      onSelect={(id) => setActiveView(id as ActiveObservabilityView)}
      contentWidth="stage"
    >
      <div className="flex min-h-full flex-1 flex-col justify-between gap-3.5 pb-2 w-full">
        {/* 顶部标题与工具栏 */}
        <header className="flex flex-col gap-2.5 pb-2 border-b border-separator-border/70">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  data-testid="page-observability"
                  className="text-title-3-semibold text-text-primary tracking-tight"
                >
                  {t("pages.observability.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-accent-600 dark:text-accent-400">
                  <span className="size-1.5 rounded-full bg-accent-500" />
                  {t("pages.observability.localApm")}
                </span>
              </div>
              <p className="text-caption-2-medium text-text-tertiary">
                {t("pages.observability.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refresh()}
                disabled={isRefreshing}
                className="gap-1.5 h-7.5 text-caption-2-medium"
              >
                <RiRefreshLine className={cx("size-3.5", isRefreshing && "animate-spin")} />
                <span>{t("pages.observability.refreshMetrics")}</span>
              </Button>
            </div>
          </div>

          {/* 视图 Tab 切换 */}
          <div className="flex items-center gap-1 pt-1">
            <button
              type="button"
              onClick={() => setActiveView("dashboard")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-medium transition-all",
                activeView === "dashboard"
                  ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiDashboardLine className="size-3.5" />
              <span>{t("pages.observability.viewDashboard")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("routing")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-medium transition-all cursor-pointer",
                activeView === "routing"
                  ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiRouteLine className="size-3.5" />
              <span>{t("pages.observability.navRouting") || "模型路由"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("traces")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-medium transition-all",
                activeView === "traces"
                  ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiFileList3Line className="size-3.5" />
              <span>{t("pages.observability.viewTraces")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("replay")}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11.5px] font-medium transition-all",
                activeView === "replay"
                  ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiFileHistoryLine className="size-3.5" />
              <span>{t("pages.observability.viewReplay")}</span>
            </button>
          </div>
        </header>
        {/* 视图分支 1: 监控与图表大盘 (含核心KPI指标看板与脱敏策略条) */}
        {activeView === "dashboard" && (
          <div className="flex flex-col gap-3.5">
            <ObservabilityKpiBar metrics={metrics} />
            <ObservabilityPolicyBar />
            {/* 第二行：双时序大图并排 (响应耗时 + Token 吞吐) */}
            <div className="grid gap-3.5 lg:grid-cols-2">
              <ObservabilityTimelineChart metrics={metrics} />
              <ObservabilityThroughputChart metrics={metrics} />
            </div>

            {/* 第三行：多维结构与性能分布网格 (超宽屏 2xl 才启用 4 列，避免笔记本与缩放屏挤压变形) */}
            <div className="grid gap-3.5 md:grid-cols-2 2xl:grid-cols-4">
              <ObservabilityModelsChart metrics={metrics} />
              <ObservabilityKindChart metrics={metrics} />
              <ObservabilityHistogramChart metrics={metrics} />
              <ObservabilityStatusChart metrics={metrics} />
            </div>
          </div>
        )}

        {/* 视图分支：模型路由与上游调度大盘 (对齐 Grok2API 路由大盘架构) */}
        {activeView === "routing" && (
          <ObservabilityModelRouting
            metrics={metrics}
            onSelectModelTrace={handleSelectModelTrace}
          />
        )}

        {/* 视图分支 2: 链路明细日志 (Traces Table View 带分页) */}
        {/* 视图分支 2: 链路明细日志 (Traces Table View 带分页 或 全景 Workbench) */}
        {activeView === "traces" &&
          (inspectMetric ? (
            <FullTraceWorkbench
              metric={inspectMetric}
              onBack={() => setInspectMetric(null)}
            />
          ) : (
            <section className="flex flex-1 flex-col justify-between gap-3 min-h-0">
              <div className="flex flex-col gap-3">
                <ObservabilityFilters
                  statusFilter={statusFilter}
                  onStatusFilterChange={(s) => {
                    setStatusFilter(s)
                    setPage(1)
                  }}
                  kindFilter={kindFilter}
                  onKindFilterChange={(k) => {
                    setKindFilter(k)
                    setPage(1)
                  }}
                  search={search}
                  onSearchChange={(q) => {
                    setSearch(q)
                    setPage(1)
                  }}
                />

                <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary px-1">
                  <span>
                    {t("pages.observability.pageShowing", {
                      n: paginatedMetrics.length,
                      total: filteredMetrics.length
                    })}
                  </span>
                  <span>{t("pages.observability.clickTrace")}</span>
                </div>

                <ObservabilityMetricsList
                  metrics={paginatedMetrics}
                  onInspect={(m) => setInspectMetric(m)}
                />
              </div>

              {/* 底部吸附分页器：始终贴合视口底边，支持10/15/20/50条自适应 */}
              <div className="mt-auto pt-2">
                <ObservabilityPagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalItems={filteredMetrics.length}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s)
                    setPage(1)
                  }}
                  pageSizeOptions={[10, 15, 20, 50]}
                />
              </div>
            </section>
          ))}

        {/* 视图分支 3: 事件流回放 */}
        {activeView === "replay" && <ObservabilityReplay />}
      </div>

      {/* Trace 详情弹窗 */}
      <ObservabilityTraceModal
        metric={inspectMetric}
        open={Boolean(inspectMetric)}
        onOpenChange={(open) => {
          if (!open) setInspectMetric(null)
        }}
      />
    </SecondaryPageShell>
  )
}
