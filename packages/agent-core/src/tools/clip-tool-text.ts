/**
 * 模型侧工具文本：超限时留开头和结尾，中间写明省掉的字符数。
 * 按 JS 字符串长度计，不引入 tokenizer。标记本身不占上限。
 */

/** bash、git 状态/日志、MCP 文本。 */
export const CLIP_COMMAND_CHARS = 16_000

/** 读文件、diff、大纲。 */
export const CLIP_FILE_CHARS = 48_000

/** grep 单行。条数上限仍在调用方。 */
export const CLIP_GREP_LINE_CHARS = 2_000

const MAX_PAYLOAD_DEPTH = 6

/** 未超限原样返回。头为上限的一半（向上取整），尾为剩余。 */
export function clipToolText(value: string, limit: number): string {
  if (value.length <= limit) return value
  const headLen = Math.ceil(limit / 2)
  const tailLen = limit - headLen
  const omitted = value.length - headLen - tailLen
  const head = value.slice(0, headLen)
  const tail = value.slice(value.length - tailLen)
  return `${head}\n...[omitted ${omitted} chars]...\n${tail}`
}

/**
 * 走到 MCP 等未知形状里的字符串。超过 6 层不再向下，避免循环引用。
 * 数字、布尔、null 保持原值。深度只在模块内部传递。
 */
export function clipToolPayload(value: unknown, limit: number): unknown {
  return clipPayloadAt(value, limit, 0)
}

function clipPayloadAt(value: unknown, limit: number, depth: number): unknown {
  if (depth > MAX_PAYLOAD_DEPTH) return value
  if (typeof value === "string") return clipToolText(value, limit)
  if (Array.isArray(value)) {
    return value.map((item) => clipPayloadAt(item, limit, depth + 1))
  }
  if (!isPlainRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    next[key] = clipPayloadAt(item, limit, depth + 1)
  }
  return next
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
