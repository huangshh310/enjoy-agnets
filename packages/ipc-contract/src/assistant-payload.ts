/**
 * 助手消息持久化载荷：
 * 纯文本消息保持原样；带思考/工具调用的消息用 JSON 信封存储，加载时再拆开。
 */

export type ToolCallState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "output-available"
  | "output-error"
  | "output-denied"

export type ThreadToolCall = {
  id: string
  name: string
  argsText?: string
  args?: unknown
  result?: unknown
  errorText?: string
  state: ToolCallState
}

export type CitedSource = {
  sourceId: string
  title: string
  path: string
  startLine?: number
  snippet?: string
}

export type CitedAsset = { assetId: string; mediaType: string; name: string }

export type AssistantExtras = {
  sources?: CitedSource[]
  assets?: CitedAsset[]
  structured?: unknown
}

export type AssistantPayload = {
  v: 1
  content: string
  reasoning?: string
  tools?: ThreadToolCall[]
  /** 本轮思考耗时（秒），结束后 Thinking 头仍显示 */
  thoughtSeconds?: number
} & AssistantExtras

const PAYLOAD_VERSION = 1

export function serializeAssistantPayload(payload: Omit<AssistantPayload, "v">): string {
  const reasoning = payload.reasoning?.trim()
  const tools = payload.tools?.filter(Boolean) ?? []
  const thoughtSeconds = payload.thoughtSeconds
  const sources = payload.sources?.filter(Boolean) ?? []
  const assets = payload.assets?.filter(Boolean) ?? []
  const hasExtras = sources.length > 0 || assets.length > 0 || payload.structured != null
  if (!reasoning && tools.length === 0 && thoughtSeconds == null && !hasExtras) {
    return payload.content
  }
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    content: payload.content,
    reasoning: reasoning || undefined,
    tools: tools.length > 0 ? tools : undefined,
    thoughtSeconds: thoughtSeconds ?? undefined,
    sources: sources.length > 0 ? sources : undefined,
    assets: assets.length > 0 ? assets : undefined,
    structured: payload.structured
  } satisfies AssistantPayload)
}

export function parseAssistantPayload(raw: string): AssistantPayload {
  if (!raw.startsWith("{")) {
    return { v: 1, content: raw }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AssistantPayload>
    if (parsed?.v === 1 && typeof parsed.content === "string") {
      return {
        v: 1,
        content: parsed.content,
        reasoning: parsed.reasoning,
        tools: parsed.tools,
        thoughtSeconds: parsed.thoughtSeconds,
        sources: parsed.sources,
        assets: parsed.assets,
        structured: parsed.structured
      }
    }
  } catch {
    // 旧会话是纯 Markdown 文本
  }
  return { v: 1, content: raw }
}
