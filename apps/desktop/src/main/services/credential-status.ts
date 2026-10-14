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

/** 结构化网络错误码：error.code（Node errno / undici），拆 cause / lastError。 */
export function networkErrorCodeOf(error: unknown, seen = new WeakSet<object>()): string | undefined {
  if (!error || typeof error !== "object") return undefined
  if (seen.has(error)) return undefined
  seen.add(error)
  const record = error as Record<string, unknown>
  if (typeof record.code === "string" && /^[A-Z][A-Z0-9_]+$/.test(record.code)) return record.code
  return networkErrorCodeOf(record.cause, seen) ?? networkErrorCodeOf(record.lastError, seen)
}

const TOOL_SURFACED_NAME = /ToolExecution|ToolCall|MCP|Mcp|StreamableHTTP|SseError|SSEError/

/**
 * 工具 / MCP 抛上来的错误（它们自己的 401 是那台服务的鉴权，不是 Providers 密钥）。
 * 链上任一层名字像工具 / MCP 错误，或带 toolCallId / toolName，就不算 provider 失败。
 */
export function isToolSurfacedError(error: unknown, seen = new WeakSet<object>()): boolean {
  if (!error || typeof error !== "object") return false
  if (seen.has(error)) return false
  seen.add(error)
  const record = error as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name : ""
  const ctor = (error as { constructor?: { name?: unknown } }).constructor?.name
  if (TOOL_SURFACED_NAME.test(name) || (typeof ctor === "string" && TOOL_SURFACED_NAME.test(ctor))) {
    return true
  }
  if (typeof record.toolCallId === "string" || typeof record.toolName === "string") return true
  return isToolSurfacedError(record.cause, seen) || isToolSurfacedError(record.lastError, seen)
}
