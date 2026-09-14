/**
 * 事件流回放播放器控制栏与过滤器。
 */
import {
  RiPauseLine,
  RiPlayLine,
  RiRestartLine,
  RiSearchLine,
  RiSkipForwardLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { EventFilterType } from "./replay.types"

export function ReplayControlsBar({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
  playbackSpeed,
  onSpeedChange,
  playbackIndex,
  totalRows,
  typeFilter,
  onTypeFilterChange,
  uniqueRuns,
  selectedRunId,
  onSelectedRunChange,
  search,
  onSearchChange,
  allRowsCount
}: {
  isPlaying: boolean
  onTogglePlay: () => void
  onStepForward: () => void
  onReset: () => void
  playbackSpeed: number
  onSpeedChange: (speed: number) => void
  playbackIndex: number
  totalRows: number
  typeFilter: EventFilterType
  onTypeFilterChange: (type: EventFilterType) => void
  uniqueRuns: string[]
  selectedRunId: string | null
  onSelectedRunChange: (runId: string | null) => void
  search: string
  onSearchChange: (val: string) => void
  allRowsCount: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-3 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isPlaying ? "default" : "outline"}
          onClick={onTogglePlay}
          className="gap-1.5 text-caption-2-medium font-semibold cursor-pointer"
        >
          {isPlaying ? (
            <>
              <RiPauseLine className="size-3.5" />
              <span>暂停</span>
            </>
          ) : (
            <>
              <RiPlayLine className="size-3.5" />
              <span>自动播放</span>
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onStepForward}
          className="gap-1 text-caption-2-medium cursor-pointer"
          title="单步步进"
        >
          <RiSkipForwardLine className="size-3.5" />
          <span>步进</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="gap-1 text-caption-2-medium cursor-pointer"
          title="重置播放进度"
        >
          <RiRestartLine className="size-3.5" />
          <span>重置</span>
        </Button>

        <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5 text-caption-2-medium">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSpeedChange(speed)}
              className={cx(
                "rounded px-1.5 py-0.5 font-bold transition-colors cursor-pointer",
                playbackSpeed === speed
                  ? "bg-background-primary-default text-text-primary shadow-2xs"
                  : "text-text-tertiary"
              )}
            >
              {speed}x
            </button>
          ))}
        </div>

        <span className="hidden sm:inline text-text-tertiary text-caption-2-medium">
          当前进度: #{playbackIndex + 1} / {totalRows}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-background-secondary-default p-0.5 text-caption-2-medium">
          <button
            type="button"
            onClick={() => onTypeFilterChange("all")}
            className={cx(
              "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
              typeFilter === "all"
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            全部 ({allRowsCount})
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange("run")}
            className={cx(
              "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
              typeFilter === "run"
                ? "bg-background-primary-default text-accent-500 shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-accent-500"
            )}
          >
            生命周期
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange("tool")}
            className={cx(
              "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
              typeFilter === "tool"
                ? "bg-background-primary-default text-purple-600 dark:text-purple-400 shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-purple-500"
            )}
          >
            工具
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange("approval")}
            className={cx(
              "rounded-md px-2 py-0.5 font-medium transition-colors cursor-pointer",
              typeFilter === "approval"
                ? "bg-background-primary-default text-amber-600 dark:text-amber-400 shadow-2xs font-semibold"
                : "text-text-tertiary hover:text-amber-500"
            )}
          >
            审批
          </button>
        </div>

        {uniqueRuns.length > 0 && (
          <select
            value={selectedRunId ?? ""}
            onChange={(e) => onSelectedRunChange(e.target.value || null)}
            className="h-7 max-w-[150px] truncate rounded-lg border border-separator-border/60 bg-background-secondary-default px-2 text-caption-2-medium text-text-primary focus:outline-none"
            title="按活跃 Run 过滤"
          >
            <option value="">全部 Run ({uniqueRuns.length})</option>
            {uniqueRuns.map((id) => (
              <option key={id} value={id}>
                {id.length > 18 ? `${id.slice(0, 16)}…` : id}
              </option>
            ))}
          </select>
        )}

        <div className="relative w-40 sm:w-48">
          <RiSearchLine className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索事件或 Run ID…"
            className="pl-7 h-7 text-caption-2-medium bg-background-secondary-default/50 font-mono"
          />
        </div>
      </div>
    </div>
  )
}
