/**
 * 日志 / OTEL 默认脱敏：prompt、文件内容、完整工具参数、Key、runtimeContext。
 */
const SECRET_KEYS = ["apikey", "api_key", "authorization", "token", "password", "secret"]

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]"
  if (typeof value === "string") return redactString(value)
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEYS.some((name) => key.toLowerCase().includes(name))) {
        out[key] = "[redacted]"
        continue
      }
      if (key === "runtimeContext" || key === "prompt" || key === "content" || key === "args") {
        out[key] = "[redacted]"
        continue
      }
      out[key] = redactValue(item, depth + 1)
    }
    return out
  }
  return value
}

export function redactString(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9]{8,}/g, "sk-[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
}

export function redactMetric(input: Record<string, unknown>): Record<string, unknown> {
  return redactValue(input) as Record<string, unknown>
}
