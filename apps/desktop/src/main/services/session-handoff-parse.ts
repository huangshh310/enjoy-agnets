/**
 * 交接 brief 的纯解析：不引用包入口，方便 node:test。
 */
export type HandoffRecord = {
  sessionId: string
  fromRuntimeId: string
  toRuntimeId: string
  summary: string
}

export function parseHandoffs(raw: string | undefined | null): Record<string, HandoffRecord> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return {}
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([sessionId, value]) => {
        const item = asHandoff(sessionId, value)
        return item ? [[sessionId, item] as const] : []
      })
    )
  } catch {
    return {}
  }
}

export function prependHandoffHistory<T extends { role: string; content: string }>(
  messages: T[],
  handoffText: string | null
): Array<T | { role: "system"; content: string }> {
  if (!handoffText) return messages
  return [{ role: "system", content: handoffText }, ...messages]
}

function asHandoff(sessionId: string, value: unknown): HandoffRecord | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const fromRuntimeId = str(row.fromRuntimeId)
  const toRuntimeId = str(row.toRuntimeId)
  const summary = str(row.summary)
  if (!sessionId || !fromRuntimeId || !toRuntimeId || !summary) return null
  if (summary.length > 8000) return null
  return { sessionId, fromRuntimeId, toRuntimeId, summary }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
