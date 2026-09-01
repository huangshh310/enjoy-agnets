/**
 * 可观测性日志过滤与检索栏组件
 */
import { RiSearchLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { MetricKindFilter, MetricStatusFilter } from "../types/observability-ui.types"

const STATUS_OPTIONS: Array<{ id: MetricStatusFilter; label: string }> = [
  { id: "all", label: "全部状态" },
  { id: "success", label: "成功 (OK)" },
  { id: "failed", label: "失败 (Failed)" },
  { id: "timeout", label: "超时 (Timeout)" },
  { id: "running", label: "运行中" }
]

const KIND_OPTIONS: Array<{ id: MetricKindFilter; label: string }> = [
  { id: "all", label: "全部类型" },
  { id: "agent", label: "Agent 循环" },
  { id: "stream", label: "文本流式" },
  { id: "image", label: "生图 (Image)" },
  { id: "video", label: "视频 (Video)" },
  { id: "embed", label: "向量 (Embedding)" }
]

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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* 状态过滤胶囊 */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = statusFilter === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusFilterChange(opt.id)}
                className={cx(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all shrink-0",
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
            placeholder="搜索 Model 或 Run ID..."
            className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default font-mono"
          />
        </div>
      </div>

      {/* 第二行：Kind 细分类型过滤 */}
      <div className="flex items-center gap-1 overflow-x-auto text-[11px] text-text-tertiary">
        <span className="font-medium mr-1 text-text-secondary">类型细分:</span>
        {KIND_OPTIONS.map((opt) => {
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
