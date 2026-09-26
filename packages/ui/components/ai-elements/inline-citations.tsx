/**
 * AI Inline Citations 行内引用与来源列表组件：
 * 参考 https://www.aicss.dev/components/inline-citations 顶级交互。
 * 支持正文上标数字胶囊、悬浮毛玻璃 Tooltip 与底部紧凑来源列表（带平滑箭头动效）。
 */
import { useMemo, useState } from "react"
import { cx } from "@/utils/cx"

export interface CitationReference {
  n: number
  label: string
  host?: string
  url?: string
  path?: string
  snippet?: string
}

export function InlineCitations({
  text,
  refs,
  onSelectRef,
  className
}: {
  text?: string
  refs: CitationReference[]
  onSelectRef?: (ref: CitationReference) => void
  className?: string
}) {
  const [hoveredN, setHoveredN] = useState<number | null>(null)

  // 解析正文中的 [1], [2] 等角标
  const parts = useMemo(() => {
    if (!text) return []
    return text.split(/(\[\d+\])/g)
  }, [text])

  return (
    <div className={cx("flex flex-col gap-3 font-sans text-caption-1-medium leading-relaxed", className)}>
      {/* 1. 正文段落（含上标引用角标） */}
      {text ? (
        <p className="m-0 text-text-primary">
          {parts.map((part, i) => {
            const match = part.match(/^\[(\d+)\]$/)
            if (!match || !match[1]) return <span key={i}>{part}</span>

            const num = Number(match[1])
            const ref = refs.find((r) => r.n === num)

            if (!ref) {
              return (
                <span
                  key={i}
                  className="inline-flex size-3.5 items-center justify-center rounded bg-background-secondary-default text-caption-2-bold font-bold text-text-tertiary mx-0.5 align-super select-none"
                >
                  {match[1]}
                </span>
              )
            }

            return (
              <span
                key={i}
                className="relative inline-block mx-0.5 align-super group/tip"
                onMouseEnter={() => setHoveredN(num)}
                onMouseLeave={() => setHoveredN(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelectRef?.(ref)}
                  className="inline-flex size-3.5 items-center justify-center rounded bg-background-secondary-default text-caption-2-bold font-bold text-text-secondary hover:bg-accent-500/15 hover:text-accent-600 dark:hover:text-accent-400 transition-colors cursor-pointer select-none"
                >
                  {ref.n}
                </button>

                {/* 悬浮毛玻璃 Tooltip */}
                <span
                  role="tooltip"
                  className={cx(
                    "pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 rounded-md bg-background-primary-default/90 backdrop-blur-md px-2 py-1 text-caption-2-medium font-medium text-text-primary shadow-md border border-separator-border/80 whitespace-nowrap transition-all duration-150 z-50",
                    hoveredN === num ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  )}
                >
                  {ref.label}
                </span>
              </span>
            )
          })}
        </p>
      ) : null}

      {/* 2. 底部紧凑来源列表 (Compact Source Footer) */}
      {refs.length > 0 ? (
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-separator-border/60">
          {refs.map((ref) => {
            const isHovered = hoveredN === ref.n

            return (
              <div
                key={ref.n}
                onClick={() => onSelectRef?.(ref)}
                onMouseEnter={() => setHoveredN(ref.n)}
                onMouseLeave={() => setHoveredN(null)}
                className={cx(
                  "group/ref flex items-center gap-2 text-caption-1-regular text-text-secondary hover:text-text-primary transition-colors cursor-pointer rounded-lg px-1.5 py-1",
                  isHovered && "bg-background-secondary-default/50 text-text-primary"
                )}
              >
                <span className="inline-flex size-3.5 items-center justify-center rounded bg-background-secondary-default text-caption-2-bold font-bold text-text-tertiary group-hover/ref:bg-accent-500/10 group-hover/ref:text-accent-500 transition-colors shrink-0">
                  {ref.n}
                </span>

                <span className="font-medium text-text-primary truncate min-w-0">
                  {ref.label}
                </span>

                {ref.host || ref.path ? (
                  <>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-caption-2-regular font-mono text-text-tertiary truncate">
                      {ref.host || ref.path}
                    </span>
                  </>
                ) : null}

                {/* 悬浮滑出斜向小箭头 */}
                <svg
                  className="size-3 text-text-tertiary transition-transform duration-200 ml-auto shrink-0 group-hover/ref:translate-x-0.5 group-hover/ref:-translate-y-0.5 group-hover/ref:text-accent-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
