/**
 * Token 分桶明细列表与可折叠子清单组件 (Token Breakdown List)
 * 包含 MCP tools、Memory files、Custom agents 三大折叠清单与子项展开。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { TokenBucketItem } from "./agent-limits.types"
import { formatTokens } from "./agent-limits-calculator"

interface TokenBreakdownListProps {
  buckets: TokenBucketItem[]
  className?: string
}

export function TokenBreakdownList({ buckets, className }: TokenBreakdownListProps) {
  // 默认展开 MCP tools、Memory files、Custom agents
  const [expandedIds, setExpandedIds] = useState<string[]>([
    "mcp_tools",
    "memory_files",
    "custom_agents"
  ])

  function toggleGroup(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const parentBuckets = buckets.filter((b) => !b.deferred)
  const deferredBuckets = buckets.filter((b) => b.deferred)
  const freeBucket = buckets.find((b) => b.category === "free_space")
  const collapsibleBuckets = buckets.filter((b) => b.children && b.children.length > 0)

  return (
    <div className={cx("flex flex-col gap-1.5 w-full pt-1 pb-0.5", className)}>
      {/* 1. 顶部主要 Token 桶清单 */}
      <div className="flex flex-col gap-0.5 w-full text-caption-1-medium">
        {parentBuckets.map((bucket) => {
          if (bucket.category === "free_space") return null

          return (
            <div
              key={bucket.id}
              className="flex items-center justify-between py-0.5 text-text-secondary select-none"
            >
              {/* 左侧：圆点指示灯 + 分类名称 */}
              <div className="flex items-center gap-2">
                <span className={cx("size-2 shrink-0 rounded-full", bucket.colorClass.split(" ")[0])} aria-hidden />
                <span className="text-text-primary">{bucket.label}</span>
              </div>

              {/* 右侧：Tokens 绝对数与百分比 */}
              <div className="flex items-center gap-4 text-right font-mono text-caption-1-regular">
                <span className="text-text-primary">{formatTokens(bucket.tokens)}</span>
                <span className="w-12 text-text-tertiary">
                  {bucket.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}

        {/* 延迟加载项 (Deferred) */}
        {deferredBuckets.map((bucket) => (
          <div
            key={bucket.id}
            className="flex items-center justify-between py-0.5 text-text-tertiary select-none"
          >
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0 bg-background-secondary-hover" aria-hidden />
              <span>{bucket.label}</span>
            </div>
            <div className="flex items-center gap-4 text-right font-mono text-caption-1-regular">
              <span>{formatTokens(bucket.tokens)}</span>
              <span className="w-12 text-text-tertiary">—</span>
            </div>
          </div>
        ))}

        {/* 剩余空间 (Free space) */}
        {freeBucket ? (
          <div className="flex items-center justify-between py-0.5 text-text-tertiary select-none">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0 bg-background-secondary-hover" aria-hidden />
              <span>{freeBucket.label}</span>
            </div>
            <div className="flex items-center gap-4 text-right font-mono text-caption-1-regular">
              <span>{formatTokens(freeBucket.tokens)}</span>
              <span className="w-12 font-medium text-text-primary">
                {freeBucket.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. 下方 3 大可折叠子清单 (MCP tools, Memory files, Custom agents) */}
      <div className="flex flex-col gap-1.5 border-t border-border-button-default/50 pt-2 text-caption-1-medium">
        {collapsibleBuckets.map((bucket) => {
          const isGroupOpen = expandedIds.includes(bucket.id)

          return (
            <div key={`group_${bucket.id}`} className="flex flex-col">
              {/* 父级行：展开箭头 + 分类名 + 汇总 Token + 子项数 */}
              <button
                type="button"
                onClick={() => toggleGroup(bucket.id)}
                className="flex items-center justify-between py-0.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {isGroupOpen ? (
                    <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
                  ) : (
                    <RiArrowRightSLine className="size-3.5 text-text-tertiary" />
                  )}
                  <span>{bucket.label}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-caption-1-regular">
                  <span className="text-text-secondary">{formatTokens(bucket.tokens)}</span>
                  <span className="w-4 text-right text-text-tertiary">
                    {bucket.children?.length}
                  </span>
                </div>
              </button>

              {/* 展开的子项目列表（支持缩进与独立 Token 数值展示） */}
              {isGroupOpen && bucket.children ? (
                <div className="flex flex-col gap-0.5 pt-0.5 pb-1 text-caption-2-medium text-text-tertiary animate-in fade-in-50 duration-150">
                  {bucket.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between pl-5 py-0.5 font-mono select-none"
                    >
                      <span className="truncate max-w-[200px] text-text-secondary">
                        {child.name}
                      </span>
                      <span className="text-text-tertiary">
                        {formatTokens(child.tokens)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
