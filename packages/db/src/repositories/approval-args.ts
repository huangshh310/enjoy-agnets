/**
 * 审批 args 比对：键排序后再序列化，并剔掉 park 补上的易变字段。
 */

/** park / 二次确认补进卡里的字段；TTL 在账本里，缩略图和身份戳每次都会变。 */
export const APPROVAL_PARK_ENRICHED_KEYS = [
  "thumbnailPath",
  "thumbnailDataUrl",
  "appKey",
  "appKeySource",
  "bypassesSessionAllow",
  "sensitive",
  "previousThumbnailPath",
  "previousThumbnailDataUrl",
  "previousObservationId",
  "previousAppName",
  "previousAppKey",
  "previousElementName",
  "previousElementRole",
  "needsSecondConfirm",
  "screenshotUnavailable",
  "appName",
  "bundleId",
  "exe",
  "aumid",
  "pid",
  "elementName",
  "elementRole"
] as const

const PARK_KEY_SET = new Set<string>(APPROVAL_PARK_ENRICHED_KEYS)

export function stripParkEnrichedFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripParkEnrichedFields)
  if (!value || typeof value !== "object") return value
  const next: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (PARK_KEY_SET.has(key)) continue
    next[key] = stripParkEnrichedFields(item)
  }
  return next
}

export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (!value || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, sortJsonKeys(record[key])])
  )
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortJsonKeys(value))
}

export function approvalArgsMatch(stored: string, incoming: unknown): boolean {
  const next = stripParkEnrichedFields(incoming ?? {})
  try {
    return canonicalizeJson(stripParkEnrichedFields(JSON.parse(stored))) === canonicalizeJson(next)
  } catch {
    return stored === JSON.stringify(next)
  }
}
