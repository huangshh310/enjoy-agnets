/**
 * 图廊卡片壳：标题 + 说明 + 图。
 */
import type { ReactNode } from "react"

export function UsageChartCard({
  title,
  hint,
  wide,
  compact,
  children
}: {
  title: string
  hint?: string
  wide?: boolean
  compact?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-4 ${compact ? "" : "min-h-[280px]"} ${wide ? "xl:col-span-2" : ""}`}
    >
      <h3 className="text-body-medium text-text-primary">{title}</h3>
      {hint ? <p className="mt-0.5 text-caption-2-medium text-text-tertiary">{hint}</p> : null}
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </section>
  )
}
