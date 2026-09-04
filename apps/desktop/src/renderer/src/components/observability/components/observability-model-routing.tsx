/**
 * 模型路由与上游调度大盘组件 (Model Routing & Dispatch Gateway)：
 * 参考 Grok2API 路由架构，实时可视化对外模型映射、多模态接口能力、
 * 上游 Provider 协议端点、路由健康度与调用性能指标，支持分页与快速探测。
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiSearchLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ObservabilityPagination } from "./observability-pagination"
import { useModelRoutingData } from "./model-routing/use-model-routing-data"
import { ModelRoutingTableRow } from "./model-routing/model-routing-table-row"
import type {
  RoutingCapabilityFilter,
  RoutingStatusFilter
} from "./model-routing/model-routing.types"

export function ObservabilityModelRouting(props: {
  metrics: TelemetryMetric[]
  onSelectModelTrace?: (modelId: string) => void
}) {
  const { metrics, onSelectModelTrace } = props
  const t = useT()
  const navigate = useNavigate()

  const {
    search,
    capabilityFilter,
    statusFilter,
    page,
    pageSize,
    totalItems,
    paginatedRows,
    probingId,
    probeResult,
    setPage,
    handlePageSizeChange,
    handleSearchChange,
    handleCapabilityChange,
    handleStatusChange,
    handleProbe
  } = useModelRoutingData(metrics)

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-3 animate-in fade-in-50 duration-200">
      {/* 顶部工具栏与分类筛选 */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border-button-default/80 bg-background-primary-default px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("pages.observability.searchRouting") || "搜索对外模型名称、上游标识或 Provider…"}
              className="pl-9 h-8.5 text-caption-1-medium bg-background-secondary-default/50"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* 能力多模态微筛选 */}
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1 text-caption-2-medium">
              <span className="px-1.5 text-text-tertiary">能力:</span>
              {(["all", "text", "tools", "vision", "image", "video", "realtime"] as const).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => handleCapabilityChange(cap as RoutingCapabilityFilter)}
                  className={cx(
                    "rounded-lg px-2 py-1 transition-all cursor-pointer",
                    capabilityFilter === cap
                      ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {cap === "all" ? "全部能力" : cap}
                </button>
              ))}
            </div>

            {/* 状态健康微筛选 */}
            <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default p-1 text-caption-2-medium">
              {(["all", "healthy", "degraded"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st as RoutingStatusFilter)}
                  className={cx(
                    "rounded-lg px-2 py-1 transition-all cursor-pointer",
                    statusFilter === st
                      ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {st === "all" ? "全部状态" : st === "healthy" ? "已就绪" : "有异常"}
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
              <span>{t("pages.observability.configProvider") || "配置 Provider"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 模型路由与调度矩阵表格 (附带专业分页器) */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-border-button-default/80 bg-background-primary-default shadow-card min-h-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption-1-medium border-collapse">
            <thead>
              <tr className="border-b border-separator-border/60 bg-background-secondary-default/40 text-text-tertiary select-none">
                <th className="px-4 py-3 font-medium">对外模型名称</th>
                <th className="px-4 py-3 font-medium">上游模型 / 协议</th>
                <th className="px-4 py-3 font-medium">接口能力</th>
                <th className="px-4 py-3 font-medium">路由状态</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium text-right">调用量</th>
                <th className="px-4 py-3 font-medium text-right">成功率</th>
                <th className="px-4 py-3 font-medium text-right">P95 延迟</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator-border/40">
              {paginatedRows.map((row) => (
                <ModelRoutingTableRow
                  key={row.id}
                  row={row}
                  probing={probingId === row.id}
                  probe={probeResult[row.id]}
                  onProbe={handleProbe}
                  onSelectModelTrace={onSelectModelTrace}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部专业分页栏 (自动贴合卡片底边) */}
        <div className="mt-auto px-4 pb-3">
          <ObservabilityPagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 15, 20, 50]}
          />
        </div>
      </div>
    </div>
  )
}
