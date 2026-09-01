/**
 * 上下文窗口分段多色进度条 (Segmented Color-Coded Context Bar)
 */
import { RiArrowDownSLine, RiArrowUpSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { ContextWindowData, TokenBucketItem } from "./agent-limits.types"
import { formatTokens } from "./agent-limits-calculator"

interface ContextWindowBarProps {
  data: ContextWindowData
  isExpanded: boolean
  onToggleExpand: () => void
  className?: string
}

export function ContextWindowBar({
  data,
  isExpanded,
  onToggleExpand,
  className
}: ContextWindowBarProps) {
  const activeBuckets = data.buckets.filter(
    (b) => b.category !== "free_space" && b.percentage > 0
  )

  return (
    <div className={cx("flex flex-col gap-2.5 w-full", className)}>
      {/* 顶部标题与用量指标行 */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="group flex items-center justify-between w-full text-left cursor-pointer outline-none select-none"
      >
        <span className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
          Context window
        </span>
        <div className="flex items-center gap-1.5 text-caption-1-medium font-medium text-text-secondary">
          <span>
            {formatTokens(data.usedTokens)} / {formatTokens(data.maxTokens)}
          </span>
          <span className="font-semibold text-text-primary">
            ({data.usedPercentage}%)
          </span>
          {isExpanded ? (
            <RiArrowUpSLine className="size-4 text-text-tertiary transition-transform group-hover:text-text-primary" />
          ) : (
            <RiArrowDownSLine className="size-4 text-text-tertiary transition-transform group-hover:text-text-primary" />
          )}
        </div>
      </button>

      {/* 分段彩条 (Segmented Progress Bar) */}
      <div
        className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 p-0.5 shadow-inner-xs"
        role="progressbar"
        aria-valuenow={data.usedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="flex size-full rounded-full overflow-hidden">
          {activeBuckets.map((bucket: TokenBucketItem) => (
            <div
              key={bucket.id}
              style={{
                width: `${Math.max(bucket.percentage, 1.5)}%`,
                backgroundColor: bucket.barColor
              }}
              title={`${bucket.label}: ${formatTokens(bucket.tokens)} (${bucket.percentage}%)`}
              className="h-full transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
