/**
 * 回放工作台顶部 KPI 统计卡片栏。
 */
import {
  RiHistoryLine,
  RiNodeTree,
  RiPulseLine,
  RiTerminalBoxLine
} from "@remixicon/react"

export type ReplayStats = {
  total: number
  capacityPercent: number
  uniqueRuns: string[]
  runEvents: number
  toolEvents: number
  approvalEvents: number
  textEvents: number
}

export function ReplayKpiBar({ stats }: { stats: ReplayStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* 卡片 1: 缓冲池水位 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">缓冲池水位</span>
          <RiTerminalBoxLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-title-3-semibold font-bold text-text-primary">
            {stats.total}
          </span>
          <span className="text-text-tertiary text-caption-2-medium">/ 400 槽位</span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <div className="h-1.5 w-full rounded-full bg-background-secondary-default overflow-hidden">
            <div
              style={{ width: `${stats.capacityPercent}%` }}
              className="h-full bg-accent-500 rounded-full transition-all"
            />
          </div>
          <span className="text-caption-2-regular text-text-tertiary">
            {stats.capacityPercent}% 已使用 · 满额自动滑动覆盖
          </span>
        </div>
      </div>

      {/* 卡片 2: 活跃 Run 批次 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">捕获会话 Run</span>
          <RiPulseLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-title-3-semibold font-bold text-text-primary">
            {stats.uniqueRuns.length}
          </span>
          <span className="text-text-tertiary text-caption-2-medium">个独立会话</span>
        </div>
        <div className="mt-2 text-caption-2-regular text-text-tertiary truncate">
          {stats.uniqueRuns.length > 0 ? (
            <span>最近: {stats.uniqueRuns[0].slice(0, 16)}</span>
          ) : (
            <span>等待新执行流入</span>
          )}
        </div>
      </div>

      {/* 卡片 3: 事件类型构成 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">事件类型细分</span>
          <RiNodeTree className="size-4 text-chart-5" />
        </div>
        <div className="mt-2 flex items-center gap-2 text-caption-2-medium">
          <span className="text-accent-500 font-semibold">{stats.runEvents} 周期</span>
          <span>·</span>
          <span className="text-chart-5 font-semibold">{stats.toolEvents} 工具</span>
          <span>·</span>
          <span className="text-status-yellow-text font-semibold">{stats.approvalEvents} 审批</span>
        </div>
        <div className="mt-2 text-caption-2-regular text-text-tertiary">
          包含 {stats.textEvents} 个流式输出 Token 增量
        </div>
      </div>

      {/* 卡片 4: 补偿保序状态 */}
      <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">断线重放机制</span>
          <RiHistoryLine className="size-4 text-state-success-text" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-title-3-semibold font-bold text-state-success-text">
            就绪
          </span>
          <span className="text-caption-2-regular text-text-tertiary font-normal">orderReplayEvents</span>
        </div>
        <div className="mt-2 text-caption-2-regular text-text-tertiary">
          按 Sequence 升序强对齐 · 乱序自动重排
        </div>
      </div>
    </div>
  )
}
