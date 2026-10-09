/**
 * 列表 cron 徽章文案。自定义只出口号，原文进 title / 开发者档。
 */
import type { TranslateFn } from "@renderer/i18n"
import { formatClock, parseCronPlain } from "./format-cron"

const DOW_KEYS = [
  "studio.automations.cronSunday",
  "studio.automations.cronMonday",
  "studio.automations.cronTuesday",
  "studio.automations.cronWednesday",
  "studio.automations.cronThursday",
  "studio.automations.cronFriday",
  "studio.automations.cronSaturday"
] as const

export function cronChipLabel(expr: string, t: TranslateFn): { label: string; raw: string; custom: boolean } {
  const raw = expr.trim()
  const parsed = parseCronPlain(raw)
  if (parsed.kind === "daily") {
    return { label: t("studio.automations.cronDaily", { time: formatClock(parsed.hour, parsed.minute) }), raw, custom: false }
  }
  if (parsed.kind === "weekdays") {
    return { label: t("studio.automations.cronWeekdays", { time: formatClock(parsed.hour, parsed.minute) }), raw, custom: false }
  }
  if (parsed.kind === "weekly") {
    return {
      label: t("studio.automations.cronWeekly", {
        day: t(DOW_KEYS[parsed.dow] ?? DOW_KEYS[0]),
        time: formatClock(parsed.hour, parsed.minute)
      }),
      raw,
      custom: false
    }
  }
  if (parsed.kind === "hourly") return { label: t("studio.automations.cronHourly"), raw, custom: false }
  if (parsed.kind === "everyMinutes") {
    return { label: t("studio.automations.cronEveryMinutes", { n: parsed.n }), raw, custom: false }
  }
  return { label: t("studio.automations.cronCustom"), raw, custom: true }
}
