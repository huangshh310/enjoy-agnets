/**
 * 日格热力：过去 12 个月、小格子、周为列。对标 Cursor / GitHub 贡献图。
 */
import { useMemo, useState } from "react"
import { UsageChartCard } from "./usage-chart-card"

const WEEKDAY_MARKS = ["", "一", "", "三", "", "五", ""]
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

type DayCell = { key: string; total: number }

export function UsageBlocksHeatmap({
  dailyTotal,
  formatValue
}: {
  dailyTotal: Array<{ day: string; total: number }>
  formatValue: (n: number) => string
}) {
  const [hover, setHover] = useState<DayCell | null>(null)
  const byDay = useMemo(() => new Map(dailyTotal.map((row) => [row.day, row.total])), [dailyTotal])
  const weeks = useMemo(() => buildYearWeeks(byDay), [byDay])
  const peak = useMemo(
    () => Math.max(1, ...[...byDay.values()].filter((n) => n > 0), 1),
    [byDay]
  )
  const monthMarks = useMemo(() => weekMonthMarks(weeks), [weeks])
  const cols = Math.max(1, weeks.length)
  const cells = weeks.flat()

  return (
    <UsageChartCard title="日格热力" hint="过去 12 个月 · 小格子按周横铺" compact>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          <div className="w-4 shrink-0" />
          <div
            className="grid min-w-0 flex-1 text-caption-2-regular text-text-tertiary"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {monthMarks.map((label, index) => (
              <span key={`m-${index}`} className="overflow-hidden whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-stretch gap-1.5">
          <div className="grid w-4 shrink-0 grid-rows-7 text-caption-2-regular leading-none text-text-tertiary">
            {WEEKDAY_MARKS.map((label, index) => (
              <span key={`d-${index}`} className="flex items-center">
                {label}
              </span>
            ))}
          </div>
          <div
            className="grid min-w-0 flex-1 gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridAutoFlow: "column",
              aspectRatio: `${cols} / 7`
            }}
          >
            {cells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className="min-h-0 min-w-0 rounded-sm"
                style={{ background: cellFill(cell.total, peak) }}
                onMouseEnter={() => setHover(cell)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-caption-2-medium text-text-tertiary">
          <span className="tabular-nums text-text-primary">
            {hover
              ? `${hover.key} · ${hover.total > 0 ? formatValue(hover.total) : "无消耗"}`
              : "悬停格子查看日期"}
          </span>
          <span className="flex items-center gap-1">
            少
            {[0, 0.25, 0.5, 0.75, 1].map((level) => (
              <span key={level} className="size-2.5 rounded-sm" style={{ background: levelFill(level) }} />
            ))}
            多
          </span>
        </div>
      </div>
    </UsageChartCard>
  )
}

function buildYearWeeks(byDay: Map<string, number>): DayCell[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = startOfMonday(today)
  end.setDate(end.getDate() + 6)
  const start = new Date(end)
  start.setDate(start.getDate() - 7 * 52 + 1)
  const aligned = startOfMonday(start)
  const weeks: DayCell[][] = []
  const cursor = new Date(aligned)
  while (cursor <= end) {
    if (weeks.length === 0 || weeks[weeks.length - 1]!.length === 7) weeks.push([])
    const key = toKey(cursor)
    weeks[weeks.length - 1]!.push({ key, total: byDay.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return weeks
}

function weekMonthMarks(weeks: DayCell[][]): string[] {
  return weeks.map((week, index) => {
    const first = week.find((cell) => cell.key.endsWith("-01"))
    if (!first) return index === 0 ? monthLabel(week[0]?.key) : ""
    return monthLabel(first.key)
  })
}

function monthLabel(key: string | undefined) {
  if (!key) return ""
  const month = Number(key.slice(5, 7))
  return MONTHS[month - 1] ?? ""
}

function toKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfMonday(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

function cellFill(total: number, peak: number) {
  if (total <= 0) return "var(--color-background-secondary-default)"
  return levelFill(Math.min(1, total / peak))
}

function levelFill(t: number) {
  if (t <= 0) return "var(--color-background-secondary-default)"
  if (t < 0.25) return "color-mix(in srgb, var(--color-accent-500) 28%, transparent)"
  if (t < 0.5) return "color-mix(in srgb, var(--color-accent-500) 48%, transparent)"
  if (t < 0.75) return "color-mix(in srgb, var(--color-accent-500) 72%, transparent)"
  return "var(--color-accent-500)"
}
