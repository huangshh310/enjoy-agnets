/**
 * 中文面 24 小时时:分选择，不用原生 time（避免十二小时制）。
 */
import { cx } from "@/utils/cx"

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute)

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

export function TimePicker24({
  hour,
  minute,
  onChange,
  className
}: {
  hour: number
  minute: number
  onChange: (next: { hour: number; minute: number }) => void
  className?: string
}) {
  return (
    <div
      data-testid="automation-schedule-time"
      className={cx("mt-1 flex items-center gap-1", className)}
    >
      <select
        aria-label="时"
        data-testid="automation-schedule-hour"
        value={hour}
        onChange={(event) => onChange({ hour: Number(event.target.value), minute })}
        className="h-8 rounded-md border border-border-button-default bg-background-primary-default px-2 text-caption-1-medium text-text-primary"
      >
        {HOURS.map((value) => (
          <option key={value} value={value}>
            {pad2(value)}
          </option>
        ))}
      </select>
      <span className="text-caption-1-medium text-text-secondary" aria-hidden>
        :
      </span>
      <select
        aria-label="分"
        data-testid="automation-schedule-minute"
        value={minute}
        onChange={(event) => onChange({ hour, minute: Number(event.target.value) })}
        className="h-8 rounded-md border border-border-button-default bg-background-primary-default px-2 text-caption-1-medium text-text-primary"
      >
        {MINUTES.map((value) => (
          <option key={value} value={value}>
            {pad2(value)}
          </option>
        ))}
      </select>
    </div>
  )
}
