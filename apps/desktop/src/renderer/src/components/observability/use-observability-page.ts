/**
 * 可观测性页状态：指标查询、过滤、分页、视图切换。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiFileHistoryLine, RiFileList3Line, RiPulseLine, RiRouteLine } from "@remixicon/react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { filterObservabilityMetrics } from "./lib/filter-observability-metrics"
import type {
  ActiveObservabilityView,
  MetricKindFilter,
  MetricStatusFilter
} from "./types/observability-ui.types"
import { useAdaptivePageSize } from "./use-adaptive-page-size"

export function useObservabilityPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<ActiveObservabilityView>("dashboard")
  const storeModels = useChatStore((state) => state.models)
  const [statusFilter, setStatusFilter] = useState<MetricStatusFilter>("all")
  const [kindFilter, setKindFilter] = useState<MetricKindFilter>("all")
  const [search, setSearch] = useState("")
  const [traceExactModelId, setTraceExactModelId] = useState<string | null>(null)
  const [inspectMetric, setInspectMetric] = useState<TelemetryMetric | null>(null)
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize } = useAdaptivePageSize()

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 200 }) as Promise<TelemetryMetric[]>
  })
  const metrics = metricsQuery.data ?? []

  const filteredMetrics = useMemo(
    () =>
      filterObservabilityMetrics(metrics, {
        statusFilter,
        kindFilter,
        search,
        exactModelId: traceExactModelId
      }),
    [metrics, statusFilter, kindFilter, search, traceExactModelId]
  )

  const paginatedMetrics = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredMetrics.slice(start, start + pageSize)
  }, [filteredMetrics, page, pageSize])

  const groups = useMemo(
    () => [
      {
        id: "metrics",
        label: t("pages.observability.navGroup"),
        items: [
          { id: "dashboard", label: t("pages.observability.navLocal"), icon: RiPulseLine, meta: String(metrics.length) },
          { id: "routing", label: t("pages.observability.navRouting"), icon: RiRouteLine, meta: String(storeModels.length) },
          { id: "traces", label: t("pages.observability.viewTraces"), icon: RiFileList3Line },
          { id: "replay", label: t("pages.observability.viewReplay"), icon: RiFileHistoryLine }
        ]
      }
    ],
    [metrics.length, storeModels.length, t]
  )

  function handleSelectModelTrace(modelId: string) {
    setTraceExactModelId(modelId)
    setSearch(modelId)
    setActiveView("traces")
    setPage(1)
  }

  return {
    t,
    groups,
    activeView,
    setActiveView,
    metrics,
    isRefreshing: metricsQuery.isFetching,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["metrics"] }),
    statusFilter,
    kindFilter,
    search,
    paginatedMetrics,
    filteredTotal: filteredMetrics.length,
    page,
    pageSize,
    setPage,
    setPageSize,
    inspectMetric,
    setInspectMetric,
    handleSelectModelTrace,
    onStatusFilterChange: (value: MetricStatusFilter) => {
      setStatusFilter(value)
      setPage(1)
    },
    onKindFilterChange: (value: MetricKindFilter) => {
      setKindFilter(value)
      setPage(1)
    },
    onSearchChange: (value: string) => {
      setTraceExactModelId(null)
      setSearch(value)
      setPage(1)
    }
  }
}
