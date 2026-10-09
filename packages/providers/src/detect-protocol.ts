/**
 * 对同一条用户 URL 并行探测 Chat、Responses、Anthropic。
 * 成功必须是 JSON 且不是网页。404 / 405 表示这门协议不在。
 * 文案只回 code，界面自己翻译。
 */
import type { ApiStyle } from "./api-styles.ts"
import { detectBase } from "./endpoints.ts"

export type ProtocolProbe = {
  style: ApiStyle
  ok: boolean
  base: string
  message: string
  code: string
}

const STYLES: readonly ApiStyle[] = ["openai", "openai-responses", "anthropic"]

export async function detectProtocols(input: {
  baseURL: string
  apiKey?: string
  modelId?: string
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
}): Promise<ProtocolProbe[]> {
  const model = input.modelId?.trim() || "detect"
  return Promise.all(STYLES.map((style) => probeStyle(style, input, model)))
}

async function probeStyle(
  style: ApiStyle,
  input: { baseURL: string; apiKey?: string; headers?: Record<string, string>; fetchImpl?: typeof fetch },
  model: string
): Promise<ProtocolProbe> {
  const base = detectBase(input.baseURL, style)
  if (!base) return { style, ok: false, base: "", message: "detectNoUrl", code: "detectNoUrl" }
  const url = requestUrl(base, style)
  const headers = requestHeaders(style, input.apiKey, input.headers)
  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: requestBody(style, model),
      signal: AbortSignal.timeout(10_000)
    })
    return classify(style, base, response)
  } catch {
    return { style, ok: false, base, message: "detectTimeout", code: "detectTimeout" }
  }
}

function requestUrl(base: string, style: ApiStyle): string {
  if (style === "openai") return `${base}/chat/completions`
  if (style === "openai-responses") return `${base}/responses`
  return `${base}/v1/messages`
}

function requestBody(style: ApiStyle, model: string): string {
  if (style === "openai-responses") {
    return JSON.stringify({
      model,
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
      max_output_tokens: 16
    })
  }
  if (style === "anthropic") {
    return JSON.stringify({ model, max_tokens: 16, messages: [{ role: "user", content: "hi" }] })
  }
  return JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 16 })
}

function requestHeaders(style: ApiStyle, apiKey: string | undefined, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    ...extra
  }
  if (style === "anthropic") {
    headers["anthropic-version"] = "2023-06-01"
    if (apiKey?.trim()) headers["x-api-key"] = apiKey.trim()
    return headers
  }
  if (apiKey?.trim()) headers.authorization = `Bearer ${apiKey.trim()}`
  return headers
}

async function classify(style: ApiStyle, base: string, response: Response): Promise<ProtocolProbe> {
  const text = await response.text()
  if (looksLikeHtml(text)) return { style, ok: false, base, message: "detectHtml", code: "detectHtml" }
  if (!isJson(text)) return { style, ok: false, base, message: "detectNotJson", code: "detectNotJson" }
  if (response.status === 404 || response.status === 405) {
    return { style, ok: false, base, message: "detectMissing", code: "detectMissing" }
  }
  return { style, ok: true, base, message: "detectOk", code: "detectOk" }
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function looksLikeHtml(text: string): boolean {
  const start = text.trimStart().slice(0, 16).toLowerCase()
  return start.startsWith("<!doctype") || start.startsWith("<html") || start.startsWith("<")
}
