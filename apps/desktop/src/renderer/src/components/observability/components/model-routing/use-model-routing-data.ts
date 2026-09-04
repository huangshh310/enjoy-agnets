/**
 * 模型路由筛选、分页与真实 Ping。Ping 走 settings.pingProvider，不打 metrics。
 */
import { useMemo, useState } from "react"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAdaptivePageSize } from "../../use-adaptive-page-size"
import { buildRoutingRows } from "./build-routing-rows"
import type { RoutingCapabilityFilter, RoutingStatusFilter } from "./model-routing.types"

export function useModelRoutingData(metrics: TelemetryMetric[]) {
  const storeModels = useChatStore((state) => state.models)
  const [search, setSearch] = useState("")
  const [capabilityFilter, setCapabilityFilter] = useState<RoutingCapabilityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<RoutingStatusFilter>("all")
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize } = useAdaptivePageSize()
  const [probingId, setProbingId] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<Record<string, { ok: boolean; ms: number }>>({})

  const routingRows = useMemo(
    () => buildRoutingRows(storeModels, metrics),
    [metrics, storeModels]
  )

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return routingRows.filter((row) => {
      if (capabilityFilter !== "all" && !row.capabilities.includes(capabilityFilter)) return false
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (!query) return true
      return (
        row.id.toLowerCase().includes(query) ||
        row.label.toLowerCase().includes(query) ||
        row.providerName.toLowerCase().includes(query) ||
        row.upstreamName.toLowerCase().includes(query)
      )
    })
  }, [capabilityFilter, routingRows, search, statusFilter])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  function resetPage() {
    setPage(1)
  }

  async function handleProbe(modelId: string) {
    const row = routingRows.find((item) => item.id === modelId)
    setProbingId(modelId)
    try {
      if (!hasIde() || !row?.providerId || !row.provider) {
        setProbeResult((prev) => ({ ...prev, [modelId]: { ok: false, ms: 0 } }))
        return
      }
      const res = (await getIde().settings.pingProvider({
        id: row.providerId,
        kind: row.provider
      })) as { ok: boolean; latencyMs: number }
      setProbeResult((prev) => ({
        ...prev,
        [modelId]: { ok: res.ok, ms: Math.round(res.latencyMs) }
      }))
    } catch {
      setProbeResult((prev) => ({ ...prev, [modelId]: { ok: false, ms: 0 } }))
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
    handlePageSizeChange: (size: number) => {
      setPageSize(size)
      resetPage()
    },
    handleSearchChange: (val: string) => {
      setSearch(val)
      resetPage()
    },
    handleCapabilityChange: (cap: RoutingCapabilityFilter) => {
      setCapabilityFilter(cap)
      resetPage()
    },
    handleStatusChange: (st: RoutingStatusFilter) => {
      setStatusFilter(st)
      resetPage()
    },
    handleProbe
  }
}
