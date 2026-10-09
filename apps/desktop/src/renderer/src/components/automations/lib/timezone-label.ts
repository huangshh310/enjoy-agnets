/**
 * 时区人话：上海用「北京时间」，其余走 Intl 长名。
 */
const BEIJING_ZONES = new Set(["Asia/Shanghai", "Asia/Chongqing", "Asia/Harbin", "PRC"])

export function isBeijingTimezone(timeZone: string): boolean {
  return BEIJING_ZONES.has(timeZone.trim())
}

export function formatTimezoneLabel(timeZone: string, locale: string): string {
  const zone = timeZone.trim() || "UTC"
  if (isBeijingTimezone(zone)) return locale.startsWith("zh") ? "北京时间" : "Beijing time"
  try {
    const name = new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en", {
      timeZone: zone,
      timeZoneName: "long"
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value
    if (name) return name
  } catch {
    // 非法 IANA 时区回落原文
  }
  return zone.replaceAll("_", " ")
}
