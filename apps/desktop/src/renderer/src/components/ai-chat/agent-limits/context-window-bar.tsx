/**
 * 上下文窗口分段多色进度条 (Segmented Color-Coded Context Bar)
 */
import { RiArrowDownSLine, RiArrowUpSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { ContextWindowData, TokenBucketItem } from "./agent-limits.types"
import { formatTokens } from "./agent-limits-calculator"
import { useT } from "@renderer/i18n"

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
  const t = useT()
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
          {t("chat.contextWindow")}
        </span>
        <div className="flex items-center gap-1.5 text-caption-1-medium font-medium text-text-secondary">
          <span>
            {formatTokens(data.usedTokens)} / {data.maxTokens > 0 ? formatTokens(data.maxTokens) : "—"}
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
        className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-background-secondary-hover p-0.5"
        role="progressbar"
        aria-valuenow={data.usedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="flex size-full rounded-full overflow-hidden">
          {activeBuckets.map((bucket: TokenBucketItem) => (
            <div
              key={bucket.id}
              style={{ width: `${bucket.percentage}%` }}
              title={t("chat.bucketTooltip", {
                label: bucket.label,
                tokens: formatTokens(bucket.tokens),
                percent: bucket.percentage
              })}
              className={cx("h-full transition-all duration-300", bucket.colorClass.split(" ")[0])}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
