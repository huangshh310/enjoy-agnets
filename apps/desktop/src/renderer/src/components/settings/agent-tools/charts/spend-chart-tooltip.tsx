/**
 * Recharts Tooltip：BoardUI token，不要 muted-foreground。
 */
import { formatTokens } from "../format-spend"

export function SpendChartTooltip({
  active,
  label,
  payload,
  formatValue
}: {
  active?: boolean
  label?: string
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  formatValue?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  const format = formatValue ?? formatTokens
  return (
    <div className="rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 shadow-dropdown">
      {label ? <p className="mb-1 text-caption-2-medium text-text-tertiary">{label}</p> : null}
      <ul className="flex flex-col gap-0.5">
        {payload.map((item) => (
          <li key={item.dataKey ?? item.name} className="flex items-center gap-2 text-caption-2-medium">
            <span className="size-1.5 rounded-full" style={{ background: item.color }} />
            <span className="text-text-secondary">{item.name}</span>
            <span className="ml-auto font-mono tabular-nums text-text-primary">
              {format(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
