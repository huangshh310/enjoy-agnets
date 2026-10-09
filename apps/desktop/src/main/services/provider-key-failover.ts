/**
 * Enjoy Local 在第一个 token 之前换下一把 Key。
 * 已经吐过文本、思考或工具就停。不改 vault，也不在流中间拼接两家的回答。
 */
const TOKEN_TYPES = new Set([
  "text-delta",
  "reasoning-delta",
  "reasoning",
  "tool-call",
  "tool-input-start",
  "tool-input-delta",
  "tool-result",
  "source",
  "file"
])

export async function* streamWithKeyFailover(
  keys: readonly string[],
  open: (apiKey: string) => Promise<AsyncIterable<Record<string, unknown>>>,
  abortSignal?: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  let lastError: unknown
  for (let index = 0; index < keys.length; index += 1) {
    if (abortSignal?.aborted) throw abortSignal.reason ?? new Error("Aborted")
    const stream = await open(keys[index] ?? "")
    const pending: Record<string, unknown>[] = []
    let switchKey = false
    try {
      for await (const part of stream) {
        if (isToken(part)) {
          for (const item of pending) yield item
          yield part
          for await (const rest of stream) yield rest
          return
        }
        if (isErrorPart(part) && index < keys.length - 1 && retryable(part)) {
          lastError = part.error
          switchKey = true
          break
        }
        pending.push(part)
      }
      // 错误片段只在换 Key 时丢掉。流正常结束（没有 token 也没有可重试错误）必须原样交出。
      if (switchKey) continue
      for (const item of pending) yield item
      return
    } catch (error) {
      if (abortSignal?.aborted || !retryable(error) || index >= keys.length - 1) throw error
      lastError = error
    }
  }
  if (lastError instanceof Error) throw lastError
  if (lastError) throw new Error("Provider request failed before the first token.")
}

function isToken(part: Record<string, unknown>): boolean {
  return TOKEN_TYPES.has(String(part.type ?? ""))
}

function isErrorPart(part: Record<string, unknown>): part is Record<string, unknown> & { error: unknown } {
  return part.type === "error"
}

function retryable(error: unknown): boolean {
  const status = readStatus(error, 0)
  if (status === undefined) return false
  return status === 401 || status === 403 || status === 408 || status === 429 || status === 529 || status >= 500
}

function readStatus(error: unknown, depth: number): number | undefined {
  if (!error || typeof error !== "object" || depth > 3) return undefined
  const record = error as Record<string, unknown>
  if (record.type === "error" && "error" in record) return readStatus(record.error, depth + 1)
  const direct = record.statusCode ?? record.status
  if (typeof direct === "number") return direct
  if ("cause" in record) return readStatus(record.cause, depth + 1)
  return undefined
}
