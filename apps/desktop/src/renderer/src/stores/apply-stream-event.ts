/**
 * 将主进程流式事件折叠进当前会话消息：
 * 累积回答文本、思考轨迹与工具调用，供对话线程按部件渲染。
 */
import {
  absorbTextDelta,
  clampThoughtSeconds,
  foldToolEvent,
  type StreamEvent
} from "@enjoy-agents/ipc-contract"
import { applyV2Part } from "./apply-v2-parts"
import type { ThreadMessage } from "./chat-store"
import { canOpenAssistantTurn, isForeignRunId, shouldFinalizeComposerRun } from "./stream-run-scope"

export type StreamPatch = {
  messages: ThreadMessage[]
  thinkingLabel?: string
  pendingApproval?: (StreamEvent & { type: "approval.required" }) | null
  running?: boolean
  runId?: string | null
  error?: string | null
}

export function reduceStreamEvent(
  messages: ThreadMessage[],
  event: StreamEvent,
  activeRunId: string | null = null
): StreamPatch {
  if (isForeignRunId(eventRunId(event), activeRunId)) return { messages }
  const terminal = applyTerminalEvent(messages, event, activeRunId)
  if (terminal) return terminal
  const approval = applyApprovalEvent(messages, event, activeRunId)
  if (approval) return approval
  if (!isLivePart(event.type) || !event.runId) return { messages }
  const next = cloneMessages(messages)
  const assistant = attachAssistant(next, event.runId, activeRunId)
  if (!assistant) return { messages }
  return applyLiveEvent(next, assistant, event)
}

function applyTerminalEvent(
  messages: ThreadMessage[],
  event: StreamEvent,
  activeRunId: string | null
): StreamPatch | null {
  if (event.type !== "run.end" && event.type !== "run.error") return null
  if (!shouldFinalizeComposerRun(event.runId, activeRunId)) return { messages }
  if (event.type === "run.error") {
    return { messages: finalizeRun(messages), running: false, error: event.message }
  }
  return { messages: finalizeRun(messages), pendingApproval: null, running: false, runId: null }
}

function applyApprovalEvent(
  messages: ThreadMessage[],
  event: StreamEvent,
  activeRunId: string | null
): StreamPatch | null {
  if (event.type === "approval.required") {
    const next = cloneMessages(messages)
    const assistant = attachAssistant(next, event.runId, activeRunId)
    if (assistant) {
      assistant.tools ??= []
      foldToolEvent(assistant.tools, event)
    }
    return { messages: next, thinkingLabel: "Waiting for approval", pendingApproval: event }
  }
  if (event.type !== "approval.resolved") return null
  const next = cloneMessages(messages)
  const assistant = lastStreamingAssistant(next)
  if (assistant) {
    assistant.tools ??= []
    foldToolEvent(assistant.tools, event)
  }
  return { messages: next, pendingApproval: null }
}

function eventRunId(event: StreamEvent): string | undefined {
  return "runId" in event ? event.runId : undefined
}

function isLivePart(type: StreamEvent["type"]) {
  return (
    type === "text.delta" ||
    type === "reasoning.delta" ||
    type === "tool.start" ||
    type === "tool.args.delta" ||
    type === "tool.result" ||
    type === "source.added" ||
    type === "asset.created" ||
    type === "structured.delta" ||
    type === "realtime.text"
  )
}

function applyLiveEvent(
  messages: ThreadMessage[],
  assistant: ThreadMessage,
  event: StreamEvent
): StreamPatch {
  if (event.type === "realtime.text") {
    assistant.content = `${assistant.content}${event.text}`
    return { messages, thinkingLabel: "Voice" }
  }
  if (event.type === "text.delta") {
    const next = absorbTextDelta(
      {
        visible: assistant.content,
        think: assistant.reasoning ?? "",
        pendingThink: Boolean(assistant.thinkOpen)
      },
      event.text
    )
    assistant.content = next.visible
    assistant.reasoning = next.think
    assistant.thinkOpen = next.pendingThink
    return { messages, thinkingLabel: next.pendingThink ? "Thinking" : "Writing" }
  }
  if (event.type === "reasoning.delta") {
    assistant.reasoning = `${assistant.reasoning ?? ""}${event.text}`
    return { messages, thinkingLabel: "Thinking" }
  }
  const v2 = applyV2Part(messages, assistant, event)
  if (v2) return v2
  assistant.tools ??= []
  foldToolEvent(assistant.tools, event)
  if (event.type === "tool.start") {
    const tool = assistant.tools.find((item) => item.id === event.toolCallId)
    if (tool && tool.reasoningChars == null) {
      tool.reasoningChars = (assistant.reasoning ?? "").length
    }
  }
  const name = event.type === "tool.args.delta"
    ? assistant.tools.find((tool) => tool.id === event.toolCallId)?.name
    : "name" in event
      ? event.name
      : "tool"
  return { messages, thinkingLabel: (name ?? "tool").replaceAll("_", " ") }
}

function cloneMessages(messages: ThreadMessage[]): ThreadMessage[] {
  return messages.map((message) => ({
    ...message,
    tools: message.tools?.map((tool) => ({ ...tool })),
    sources: message.sources?.map((source) => ({ ...source })),
    assets: message.assets?.map((asset) => ({ ...asset }))
  }))
}

function lastStreamingAssistant(messages: ThreadMessage[]): ThreadMessage | undefined {
  const last = messages.at(-1)
  return last?.role === "assistant" && last.streaming ? last : undefined
}

function attachAssistant(
  messages: ThreadMessage[],
  runId: string,
  activeRunId: string | null
): ThreadMessage | undefined {
  const existing = lastStreamingAssistant(messages)
  if (existing) return activeRunId ? existing : undefined
  if (!canOpenAssistantTurn(runId, activeRunId)) return undefined
  const created: ThreadMessage = {
    id: `msg_${runId}`,
    role: "assistant",
    content: "",
    createdAt: Date.now(),
    streaming: true,
    reasoning: "",
    tools: []
  }
  messages.push(created)
  return created
}

function finalizeRun(messages: ThreadMessage[]): ThreadMessage[] {
  return messages.map((message) => ({
    ...message,
    streaming: false,
    thinkOpen: false,
    thoughtSeconds: message.streaming
      ? (clampThoughtSeconds(message.createdAt) ?? undefined)
      : message.thoughtSeconds,
    tools: message.tools?.map((tool) =>
      tool.state === "input-streaming" || tool.state === "input-available"
        ? { ...tool, state: "output-error" as const, errorText: tool.errorText ?? "No result received." }
        : tool
    )
  }))
}
