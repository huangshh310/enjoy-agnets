/**
 * 定时：每天 / 工作日 / 每周 + 时间；高级才露 cron。
 */
import { useState } from "react"
import { RiCalendarScheduleLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useI18n, useT } from "@renderer/i18n"
import { joinSegments } from "@renderer/lib/join-segments"
import { cronChipLabel } from "../lib/cron-chip-label"
import {
  clockValue,
  cronFromSchedule,
  parseClockValue,
  scheduleFromCron,
  type SchedulePreset
} from "../lib/schedule-preset"
import { formatTimezoneAdvanced, formatTimezoneLabel } from "../lib/timezone-label"

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
  const readable = cronChipLabel(cronExpr, t)
  const preview = advanced
    ? readable.label
    : joinSegments(readable.label, formatTimezoneLabel(timeZone, locale))

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
              parsed.preset === preset
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
              lang="en-GB"
              step={60}
              value={clockValue(parsed.hour, parsed.minute)}
              onChange={(event) => {
                const next = parseClockValue(event.target.value)
                if (!next) return
                onChange({ cronExpr: cronFromSchedule({ ...parsed, ...next }) })
              }}
              className="mt-1 w-32"
              data-testid="automation-schedule-time"
            />
          </label>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p
          className="flex items-start gap-1.5 text-caption-2-regular text-text-secondary"
          data-testid="automation-schedule-preview"
        >
          <RiCalendarScheduleLine className="mt-0.5 size-3.5 shrink-0 text-text-secondary" aria-hidden />
          <span className="min-w-0 break-words">{preview}</span>
        </p>
        <button
          type="button"
          data-testid="automation-schedule-advanced"
          onClick={() => setAdvanced((open) => !open)}
          className="w-fit text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          {t("studio.automations.scheduleAdvanced")}
        </button>
      </div>
      {advanced ? (
        <div className="flex flex-col gap-3">
          <label className="block space-y-1">
            <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.cronExprCustom")}</span>
            <Input
              value={cronExpr}
              onChange={(event) => onChange({ cronExpr: event.target.value })}
              className="font-mono"
              data-testid="automation-cron-expr"
            />
            <span className="block text-caption-2-regular text-text-secondary" data-testid="automation-cron-readable">
              {readable.label}
            </span>
          </label>
          <div className="space-y-1" data-testid="automation-timezone-field">
            <span className="text-caption-1-medium text-text-secondary">{t("studio.automations.timeZone")}</span>
            <p
              data-testid="automation-timezone-advanced"
              className="text-caption-1-medium text-text-primary"
            >
              {formatTimezoneAdvanced(timeZone, locale)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
