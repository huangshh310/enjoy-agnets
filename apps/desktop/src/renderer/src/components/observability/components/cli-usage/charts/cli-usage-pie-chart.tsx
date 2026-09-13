/**
 * 本机记录环形占比图：支持 CLI 来源占比与 Top 模型占比。
 * 甜甜圈与图例横排，交互悬停高亮联动。
 */
import { useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { spendSliceFill, type SpendSlice } from "@renderer/components/settings/agent-tools/charts/spend-chart-colors"
import { SpendChartTooltip } from "@renderer/components/settings/agent-tools/charts/spend-chart-tooltip"
import { formatTokens } from "@renderer/components/settings/agent-tools/format-spend"

export function CliUsagePieChart({
  slices,
  type,
  centerPrimary,
  centerUnit,
  emptyMessage,
  selectedId,
  onSelectSlice
}: {
  slices: SpendSlice[]
  type: "sources" | "models"
  centerPrimary: string
  centerUnit: string
  emptyMessage: string
  selectedId?: string | null
  onSelectSlice?: (id: string) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const hovered = slices.find((slice) => slice.id === (hoverId ?? selectedId))
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)

  if (slices.length === 0 || total <= 0) {
    return (
      <p className="flex h-52 items-center justify-center text-caption-2-medium text-text-tertiary">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-5">
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
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoverId(slice.id)}
                  onClick={() => onSelectSlice?.(slice.id)}
                />
              ))}
            </Pie>
            <Tooltip content={<SpendChartTooltip formatValue={formatTokens} />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
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
          const isSelected = selectedId === slice.id
          const isHovered = hoverId === slice.id
          return (
            <li
              key={slice.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-caption-2-medium transition-colors ${
                isSelected
                  ? "bg-accent-500/10 text-accent-500 font-medium"
                  : isHovered
                    ? "bg-background-secondary-hover"
                    : "hover:bg-background-secondary-hover/60"
              }`}
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelectSlice?.(slice.id)}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: spendSliceFill(slice.id, index) }}
              />
              {type === "sources" ? (
                <AgentBrandIcon id={slice.id} size={12} />
              ) : (
                <span className="font-mono text-[10px] text-text-tertiary">•</span>
              )}
              <span className="min-w-0 flex-1 truncate text-text-primary" title={slice.label}>
                {slice.label}
              </span>
              <span className="tabular-nums text-text-tertiary">{share}%</span>
              <span className="font-mono tabular-nums text-text-primary min-w-[3.5rem] text-right">
                {slice.displayAmount}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
