/**
 * 模型路由大盘：遥测聚合 + 真实 Ping + 跳转 traces / Provider 设置。
 */
import { useNavigate } from "@tanstack/react-router"
import { RiSearchLine, RiShieldKeyholeLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ObservabilityPagination } from "./observability-pagination"
import { ModelRoutingTableRow } from "./model-routing/model-routing-table-row"
import { useModelRoutingData } from "./model-routing/use-model-routing-data"
import type { RoutingCapabilityFilter, RoutingStatusFilter } from "./model-routing/model-routing.types"

const CAP_FILTERS: RoutingCapabilityFilter[] = [
  "all",
  "text",
  "tools",
  "vision",
  "image",
  "video",
  "realtime"
]
const STATUS_FILTERS: RoutingStatusFilter[] = ["all", "healthy", "degraded", "unconfigured"]

const CHIP =
  "rounded-lg px-2 py-1 cursor-pointer text-caption-2-medium"
const CHIP_ON = "bg-background-primary-default text-text-primary shadow-2xs"
const CHIP_OFF = "text-text-secondary hover:text-text-primary"

function capLabel(cap: RoutingCapabilityFilter, t: (path: string) => string): string {
  if (cap === "all") return t("pages.observability.capAll")
  return t(`pages.observability.cap${cap[0]?.toUpperCase()}${cap.slice(1)}`)
}

function statusFilterLabel(status: RoutingStatusFilter, t: (path: string) => string): string {
  if (status === "all") return t("pages.observability.statusAll")
  if (status === "healthy") return t("pages.observability.statusHealthy")
  if (status === "degraded") return t("pages.observability.statusDegraded")
  return t("pages.observability.statusUnconfigured")
}

export function ObservabilityModelRouting(props: {
  metrics: TelemetryMetric[]
  onSelectModelTrace?: (modelId: string) => void
}) {
  const { metrics, onSelectModelTrace } = props
  const t = useT()
  const navigate = useNavigate()
  const data = useModelRoutingData(metrics)

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-3 animate-in fade-in-50 duration-200">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border-button-default/80 bg-background-primary-default px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[240px] flex-1">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={data.search}
              onChange={(event) => data.handleSearchChange(event.target.value)}
              placeholder={t("pages.observability.searchRouting")}
              className="h-8.5 bg-background-secondary-default/50 pl-9 text-caption-1-medium"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1">
              {CAP_FILTERS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => data.handleCapabilityChange(cap)}
                  className={cx(CHIP, data.capabilityFilter === cap ? CHIP_ON : CHIP_OFF)}
                >
                  {capLabel(cap, t)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => data.handleStatusChange(status)}
                  className={cx(CHIP, data.statusFilter === status ? CHIP_ON : CHIP_OFF)}
                >
                  {statusFilterLabel(status, t)}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
              className="h-8.5 gap-1.5 px-3 text-caption-2-medium shadow-2xs"
            >
              <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
              <span>{t("pages.observability.configProvider")}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-border-button-default/80 bg-background-primary-default shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-caption-1-medium">
            <thead>
              <tr className="select-none border-b border-separator-border/60 bg-background-secondary-default/40 text-text-tertiary">
                <th className="px-4 py-3 font-medium">{t("pages.observability.colOutbound")}</th>
                <th className="px-4 py-3 font-medium">{t("pages.observability.colUpstream")}</th>
                <th className="px-4 py-3 font-medium">{t("pages.observability.colCaps")}</th>
                <th className="px-4 py-3 font-medium">{t("pages.observability.colRouteStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("pages.observability.colSource")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("pages.observability.colCalls")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("pages.observability.colSuccess")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("pages.observability.colP95")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("pages.observability.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator-border/40">
              {data.paginatedRows.map((row) => (
                <ModelRoutingTableRow
                  key={row.id}
                  row={row}
                  probing={data.probingId === row.id}
                  probe={data.probeResult[row.id]}
                  onProbe={data.handleProbe}
                  onSelectModelTrace={onSelectModelTrace}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-auto px-4 pb-3">
          <ObservabilityPagination
            currentPage={data.page}
            pageSize={data.pageSize}
            totalItems={data.totalItems}
            onPageChange={data.setPage}
            onPageSizeChange={data.handlePageSizeChange}
            pageSizeOptions={[10, 15, 20, 50]}
          />
        </div>
      </div>
    </div>
  )
}
