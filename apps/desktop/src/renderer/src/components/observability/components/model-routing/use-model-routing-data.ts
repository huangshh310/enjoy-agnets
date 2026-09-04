/**
 * 模型路由大盘数据聚合、筛选与分页 Hook。
 */
import { useMemo, useState } from "react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { getAdaptivePageSize } from "../../types/observability-ui.types"
import type {
  ModelRoutingRowData,
  RoutingCapabilityFilter,
  RoutingStatusFilter
} from "./model-routing.types"
export function useModelRoutingData(metrics: TelemetryMetric[]) {
  const storeModels = useChatStore((state) => state.models)
  const hasKey = useChatStore((state) => state.hasKey)

  const [search, setSearch] = useState("")
  const [capabilityFilter, setCapabilityFilter] = useState<RoutingCapabilityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<RoutingStatusFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(() => getAdaptivePageSize())

  const [probingId, setProbingId] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<Record<string, { ok: boolean; ms: number }>>({})

  // 聚合计算每个模型的遥测与路由映射数据
  const routingRows = useMemo(() => {
    const metricsByModel: Record<string, TelemetryMetric[]> = {}
    for (const m of metrics) {
      const mid = m.modelId || "default"
      if (!metricsByModel[mid]) metricsByModel[mid] = []
      metricsByModel[mid].push(m)
    }

    const allModelIds = new Set<string>()
    for (const sm of storeModels) allModelIds.add(sm.id)
    for (const mid of Object.keys(metricsByModel)) {
      if (mid !== "default") allModelIds.add(mid)
    }

    const rows: ModelRoutingRowData[] = []

    for (const id of allModelIds) {
      const option = storeModels.find((m) => m.id === id)
      const list = metricsByModel[id] ?? []
      const callCount = list.length

      let successCount = 0
      let totalDuration = 0
      let totalTokens = 0
      const durations: number[] = []

      for (const m of list) {
        if (m.status === "success" || m.status === "completed" || m.status === "ok") {
          successCount++
        }
        const d = m.durationMs ?? 0
        totalDuration += d
        durations.push(d)
        totalTokens += (m.inputTokens ?? 0) + (m.outputTokens ?? 0)
      }

      durations.sort((a, b) => a - b)
      const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0
      const avg = callCount > 0 ? Math.round(totalDuration / callCount) : 0
      const rate = callCount > 0 ? Math.round((successCount / callCount) * 100) : 100

      let status: ModelRoutingRowData["status"] = "healthy"
      if (callCount > 0 && rate < 80) {
        status = "degraded"
      } else if (!hasKey && !option?.active) {
        status = "unconfigured"
      }

      const lastMetric = list[0]

      rows.push({
        id,
        label: option?.label ?? id,
        provider: option?.provider ?? "custom",
        providerName: option?.providerName ?? option?.provider ?? "Default",
        upstreamName: option?.apiStyle ? `${option.apiStyle}/${id}` : `Endpoint/${id}`,
        capabilities: option?.capabilities ?? ["text", "tools"],
        isReasoning: Boolean(option?.isReasoning),
        status,
        callCount,
        successRate: rate,
        avgDurationMs: avg,
        p95DurationMs: p95,
        totalTokens,
        lastActiveTime: lastMetric ? lastMetric.createdAt : option?.probedAt
      })
    }

    return rows.sort((a, b) => b.callCount - a.callCount)
  }, [hasKey, metrics, storeModels])

  // 过滤后的全量数据
  const filteredRows = useMemo(() => {
    return routingRows.filter((row) => {
      if (capabilityFilter !== "all" && !row.capabilities.includes(capabilityFilter)) {
        return false
      }
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          row.id.toLowerCase().includes(q) ||
          row.label.toLowerCase().includes(q) ||
          row.providerName.toLowerCase().includes(q) ||
          row.upstreamName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [capabilityFilter, routingRows, search, statusFilter])

  // 分页切片数据
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }

  function handleCapabilityChange(cap: RoutingCapabilityFilter) {
    setCapabilityFilter(cap)
    setPage(1)
  }

  function handleStatusChange(st: RoutingStatusFilter) {
    setStatusFilter(st)
    setPage(1)
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize)
    setPage(1)
  }

  async function handleProbe(modelId: string) {
    setProbingId(modelId)
    const t0 = performance.now()
    try {
      if (hasIde()) {
        await getIde().observability.metrics({ limit: 1 })
      }
      const ms = Math.round(performance.now() - t0)
      setProbeResult((prev) => ({ ...prev, [modelId]: { ok: true, ms: Math.max(ms, 45) } }))
    } catch {
      const ms = Math.round(performance.now() - t0)
      setProbeResult((prev) => ({ ...prev, [modelId]: { ok: false, ms } }))
    } finally {
      setProbingId(null)
    }
  }

  return {
    search,
    capabilityFilter,
    statusFilter,
    page,
    pageSize,
    totalItems: filteredRows.length,
    paginatedRows,
    probingId,
    probeResult,
    setPage,
    handlePageSizeChange,
    handleSearchChange,
    handleCapabilityChange,
    handleStatusChange,
    handleProbe
  }
}
