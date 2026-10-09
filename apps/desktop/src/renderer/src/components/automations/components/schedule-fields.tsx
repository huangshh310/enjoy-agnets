/**
 * 定时：每天 / 工作日 / 每周 + 时间；高级才露 cron。
 */
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useI18n, useT } from "@renderer/i18n"
import { formatClock } from "../lib/format-cron"
import {
  clockValue,
  cronFromSchedule,
  parseClockValue,
  scheduleFromCron,
  type SchedulePreset
} from "../lib/schedule-preset"
import { formatTimezoneLabel } from "../lib/timezone-label"

const PRESETS: SchedulePreset[] = ["daily", "weekdays", "weekly"]
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

const DAY_KEYS = [
  "studio.automations.cronSunday",
  "studio.automations.cronMonday",
  "studio.automations.cronTuesday",
  "studio.automations.cronWednesday",
  "studio.automations.cronThursday",
  "studio.automations.cronFriday",
  "studio.automations.cronSaturday"
] as const

const PRESET_KEYS = {
  daily: "studio.automations.scheduleDaily",
  weekdays: "studio.automations.scheduleWeekdays",
  weekly: "studio.automations.scheduleWeekly"
} as const

export function ScheduleFields({
  cronExpr,
  timeZone,
  onChange
}: {
  cronExpr: string
  timeZone: string
  onChange: (patch: { cronExpr?: string; timeZone?: string }) => void
}) {
  const t = useT()
  const { locale } = useI18n()
  const parsed = scheduleFromCron(cronExpr)
  const [advanced, setAdvanced] = useState(parsed.preset === "advanced")
  const preview = previewLine(parsed.preset === "advanced" && advanced ? "advanced" : parsed.preset, parsed, t)

  return (
    <div className="space-y-2" data-testid="automation-schedule">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAdvanced(false)
              onChange({ cronExpr: cronFromSchedule({ ...parsed, preset }) })
            }}
            className={cx(
              "rounded-full px-2 py-1 text-caption-1-medium ring-1",
              !advanced && parsed.preset === preset
                ? "bg-accent-500/10 text-text-primary ring-accent-500/30"
                : "bg-background-secondary-default text-text-secondary ring-border-button-default"
            )}
          >
            {t(PRESET_KEYS[preset])}
          </button>
        ))}
      </div>
      {advanced || parsed.preset === "advanced" ? null : (
        <div className="flex flex-wrap items-end gap-2">
          {parsed.preset === "weekly" ? (
            <label className="block">
              <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.scheduleWeekly")}</span>
              <select
                value={parsed.dow}
                onChange={(event) =>
                  onChange({
                    cronExpr: cronFromSchedule({ ...parsed, preset: "weekly", dow: Number(event.target.value) })
                  })
                }
                className="mt-1 h-8 rounded-md border border-border-button-default bg-background-primary-default px-2 text-caption-1-medium text-text-primary"
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {t(DAY_KEYS[day])}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.scheduleTime")}</span>
            <Input
              type="time"
              value={clockValue(parsed.hour, parsed.minute)}
              onChange={(event) => {
                const next = parseClockValue(event.target.value)
                if (!next) return
                onChange({ cronExpr: cronFromSchedule({ ...parsed, ...next }) })
              }}
              className="mt-1 w-32"
            />
          </label>
        </div>
      )}
      <p className="text-caption-2-regular text-text-secondary" data-testid="automation-schedule-preview">
        {preview} · {formatTimezoneLabel(timeZone, locale)}
      </p>
      <button
        type="button"
        data-testid="automation-schedule-advanced"
        onClick={() => setAdvanced((open) => !open)}
        className="text-caption-2-medium text-text-secondary hover:text-text-primary"
      >
        {t("studio.automations.scheduleAdvanced")}
      </button>
      {advanced ? (
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.cronLabel")}</span>
            <Input
              value={cronExpr}
              onChange={(event) => onChange({ cronExpr: event.target.value })}
              className="mt-1 font-mono"
            />
          </label>
          <label>
            <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.timeZone")}</span>
            <Input
              value={timeZone}
              onChange={(event) => onChange({ timeZone: event.target.value })}
              className="mt-1"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function previewLine(
  preset: SchedulePreset,
  parsed: ReturnType<typeof scheduleFromCron>,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const time = formatClock(parsed.hour, parsed.minute)
  if (preset === "daily") return t("studio.automations.cronDaily", { time })
  if (preset === "weekdays") return t("studio.automations.cronWeekdays", { time })
  if (preset === "weekly") {
    return t("studio.automations.cronWeekly", { day: t(DAY_KEYS[parsed.dow] ?? DAY_KEYS[1]), time })
  }
  return t("studio.automations.cronCustom")
}
