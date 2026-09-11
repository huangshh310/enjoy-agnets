/**
 * 花费占比：甜甜圈与图例横排，避免图例把 Hub 撑高。
 */
import { useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { SpendChartTooltip } from "./spend-chart-tooltip"
import { spendSliceFill, type SpendSlice } from "./spend-chart-colors"

export function SpendPieChart({
  slices,
  centerPrimary,
  centerUnit,
  emptyMessage,
  formatValue
}: {
  slices: SpendSlice[]
  centerPrimary: string
  centerUnit: string
  emptyMessage: string
  formatValue?: (value: number) => string
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const hovered = slices.find((slice) => slice.id === hoverId)
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)

  if (slices.length === 0 || total <= 0) {
    return <p className="py-8 text-center text-caption-2-medium text-text-tertiary">{emptyMessage}</p>
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[9.5rem] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="label"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
              onMouseLeave={() => setHoverId(null)}
            >
              {slices.map((slice, index) => (
                <Cell
                  key={slice.id}
                  fill={spendSliceFill(slice.id, index)}
                  opacity={hoverId && hoverId !== slice.id ? 0.28 : 1}
                  onMouseEnter={() => setHoverId(slice.id)}
                />
              ))}
            </Pie>
            <Tooltip content={<SpendChartTooltip formatValue={formatValue} />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-title-3-semibold tabular-nums text-text-primary">
            {hovered ? hovered.displayAmount : centerPrimary}
          </span>
          <span className="max-w-[6.5rem] truncate text-caption-2-medium text-text-tertiary">
            {hovered ? hovered.label : centerUnit}
          </span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.map((slice, index) => {
          const share = Math.round((slice.amount / total) * 100)
          return (
            <li
              key={slice.id}
              className="flex items-center gap-2 text-caption-2-medium"
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: spendSliceFill(slice.id, index) }} />
              <AgentBrandIcon id={slice.id} size={12} />
              <span className="min-w-0 flex-1 truncate text-text-primary">{slice.label}</span>
              <span className="tabular-nums text-text-tertiary">{share}%</span>
              <span className="font-mono tabular-nums text-text-primary">{slice.displayAmount}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
