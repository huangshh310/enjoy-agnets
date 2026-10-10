/**
 * 从错误对象读结构化 HTTP 状态 / type。拆 RetryError.lastError 与 cause。
 */

export function httpStatusOf(error: unknown, seen = new WeakSet<object>()): number | undefined {
  if (!error || typeof error !== "object") return undefined
  if (seen.has(error)) return undefined
  seen.add(error)
  const record = error as Record<string, unknown>
  for (const key of ["status", "statusCode", "status_code"]) {
    if (typeof record[key] === "number") return record[key] as number
  }
  return httpStatusOf(record.lastError, seen) ?? httpStatusOf(record.cause, seen)
}

export function structuredErrorTypeOf(
  error: unknown,
  seen = new WeakSet<object>()
): string | undefined {
  if (!error || typeof error !== "object") return undefined
  if (seen.has(error)) return undefined
  seen.add(error)
  const record = error as Record<string, unknown>
  for (const value of [record.type, record.errorType]) {
    if (isStructuredType(value)) return value
  }
  const nested = record.error
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>
    for (const value of [inner.type, inner.code]) {
      if (isStructuredType(value)) return value
    }
  }
  const data = record.data
  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>
    if (isStructuredType(payload.type)) return payload.type
    const inner = payload.error
    if (inner && typeof inner === "object") {
      const typed = inner as Record<string, unknown>
      if (isStructuredType(typed.type)) return typed.type
    }
  }
  return structuredErrorTypeOf(record.lastError, seen) ?? structuredErrorTypeOf(record.cause, seen)
}

function isStructuredType(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !/^\d+$/.test(value)
}
