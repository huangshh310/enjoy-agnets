/**
 * 解开 AI SDK / 网关错误链。No output generated 只是外壳，正文往往在 cause / responseBody。
 */
const EMPTY_OUTPUT = /no output generated/i

export function unwrapErrorMessage(error: unknown, depth = 0): string {
  if (depth > 6) return "Unknown provider error."
  if (typeof error === "string" && error.trim()) return error.trim()
  if (!error || typeof error !== "object") return String(error)

  const record = error as Record<string, unknown>
  const own = typeof record.message === "string" ? record.message.trim() : ""
  const nested = record.cause != null ? unwrapErrorMessage(record.cause, depth + 1) : ""
  const body = readErrorBody(record)

  if (own && !EMPTY_OUTPUT.test(own)) {
    if (nested && nested !== own && !own.includes(nested)) return `${own} (${nested})`
    return own
  }
  if (nested && !EMPTY_OUTPUT.test(nested)) return nested
  if (body) return body
  if (own) {
    return "The provider returned no model output. Confirm the model ID exists on this gateway, the API key is valid, and turn off Max reasoning unless the model supports it."
  }
  return "Unknown provider error."
}

function readErrorBody(record: Record<string, unknown>): string {
  if (typeof record.responseBody === "string" && record.responseBody.trim()) {
    return record.responseBody.trim()
  }
  const data = record.data
  if (typeof data === "string" && data.trim()) return data.trim()
  if (!data || typeof data !== "object") return ""
  const inner = data as Record<string, unknown>
  if (typeof inner.error === "string" && inner.error.trim()) return inner.error.trim()
  if (inner.error && typeof inner.error === "object" && "message" in inner.error) {
    const message = (inner.error as { message: unknown }).message
    if (typeof message === "string" && message.trim()) return message.trim()
  }
  try {
    return JSON.stringify(data)
  } catch {
    return ""
  }
}
