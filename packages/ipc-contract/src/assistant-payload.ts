/**
 * 助手消息持久化载荷：
 * 纯文本消息保持原样；带思考 / 工具 / runKind / 引导词的消息用 JSON 信封存储，加载时再拆开。
 */
import { takeActionChips, type ActionChip } from "./action-chip.ts"

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
  /** 该工具开始时 assistant.reasoning 的字数，用来把思考链按步骤切开。 */
  reasoningChars?: number
  /** 子 Agent 工具挂到父 delegate 的 toolCallId。 */
  parentToolCallId?: string
}

export type CitedSource = {
  sourceId: string
  title: string
  path: string
  startLine?: number
  endLine?: number
  snippet?: string
}

export type CitedAsset = { assetId: string; mediaType: string; name: string }

export type AssistantExtras = {
  sources?: CitedSource[]
  assets?: CitedAsset[]
  structured?: unknown
}

/** 发送时 stamp：hydrate 回放认这个，不认当前模型选择器。 */
export type AssistantRunKind = "agent" | "image" | "video"

export type AssistantPayload = {
  v: 1
  content: string
  reasoning?: string
  tools?: ThreadToolCall[]
  /** 本轮思考耗时（秒），结束后 Thinking 头仍显示 */
  thoughtSeconds?: number
  runKind?: AssistantRunKind
  /** 本轮实际用的模型，换模后旧泡不改写。 */
  modelId?: string
  runtimeId?: string
  /** 轮末静态引导词；未点击不得自动发送。 */
  actionChips?: ActionChip[]
} & AssistantExtras

const PAYLOAD_VERSION = 1

export function serializeAssistantPayload(payload: Omit<AssistantPayload, "v">): string {
  const taken = takeActionChips(payload.content, payload.actionChips)
  const reasoning = payload.reasoning?.trim()
  const tools = payload.tools?.filter(Boolean) ?? []
  const thoughtSeconds = payload.thoughtSeconds
  const sources = payload.sources?.filter(Boolean) ?? []
  const assets = payload.assets?.filter(Boolean) ?? []
  const actionChips = taken.chips
  const hasExtras = sources.length > 0 || assets.length > 0 || payload.structured != null
  const runKind = parseRunKind(payload.runKind)
  const modelId = payload.modelId?.trim() || undefined
  const runtimeId = payload.runtimeId?.trim() || undefined
  // 有 runKind / 引导词 / 本轮模型必须走信封，否则 hydrate 只能靠资产/正文推断。
  if (
    !reasoning &&
    tools.length === 0 &&
    thoughtSeconds == null &&
    !hasExtras &&
    !runKind &&
    !modelId &&
    !runtimeId &&
    actionChips.length === 0
  ) {
    return taken.content
  }
  return JSON.stringify({
    v: PAYLOAD_VERSION,
    content: taken.content,
    reasoning: reasoning || undefined,
    tools: tools.length > 0 ? tools : undefined,
    thoughtSeconds: thoughtSeconds ?? undefined,
    sources: sources.length > 0 ? sources : undefined,
    assets: assets.length > 0 ? assets : undefined,
    structured: payload.structured,
    runKind,
    modelId,
    runtimeId,
    actionChips: actionChips.length > 0 ? actionChips : undefined
  } satisfies AssistantPayload)
}

export function parseAssistantPayload(raw: string): AssistantPayload {
  if (!raw.startsWith("{")) {
    return sealActionChips({ v: 1, content: raw })
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AssistantPayload>
    if (parsed?.v === 1 && typeof parsed.content === "string") {
      return sealActionChips({
        v: 1,
        content: parsed.content,
        reasoning: parsed.reasoning,
        tools: parsed.tools,
        thoughtSeconds: parsed.thoughtSeconds,
        sources: parsed.sources,
        assets: parsed.assets,
        structured: parsed.structured,
        runKind: parseRunKind(parsed.runKind),
        modelId: typeof parsed.modelId === "string" ? parsed.modelId : undefined,
        runtimeId: typeof parsed.runtimeId === "string" ? parsed.runtimeId : undefined,
        actionChips: parsed.actionChips
      })
    }
  } catch {
    // 旧会话是纯 Markdown 文本
  }
  return sealActionChips({ v: 1, content: raw })
}

function sealActionChips(payload: AssistantPayload): AssistantPayload {
  const taken = takeActionChips(payload.content, payload.actionChips)
  return {
    ...payload,
    content: taken.content,
    actionChips: taken.chips.length > 0 ? taken.chips : undefined
  }
}

function parseRunKind(value: unknown): AssistantRunKind | undefined {
  if (value === "agent" || value === "image" || value === "video") return value
  return undefined
}
