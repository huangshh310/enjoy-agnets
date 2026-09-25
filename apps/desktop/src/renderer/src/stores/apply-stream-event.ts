/**
 * 将主进程流式事件折叠进当前会话消息：
 * 累积回答文本、思考轨迹与工具调用，供对话线程按部件渲染。
 */
import {
  absorbTextDelta,
  clampThoughtSeconds,
  foldToolEvent,
  takeActionChips,
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
  notice?: string | null
}

export function reduceStreamEvent(
  messages: ThreadMessage[],
  event: StreamEvent,
  activeRunId: string | null = null
): StreamPatch {
  if (event.type === "run.start") {
    if (isForeignRunId(event.runId, activeRunId)) return { messages }
    return {
      messages: event.prompt ? appendPromptTurn(messages, event.prompt, event.runId) : messages,
      running: true,
      runId: event.runId,
      error: null
    }
  }
  if (isForeignRunId(eventRunId(event), activeRunId)) return { messages }
  const terminal = applyTerminalEvent(messages, event, activeRunId)
  if (terminal) return terminal
  const approval = applyApprovalEvent(messages, event, activeRunId)
  if (approval) return approval
  if (event.type === "generation.warning" && event.code === "acp_resume_fallback") {
    return { messages, notice: event.message }
  }
  if (event.type === "file.changed") return { messages }
  if (!isLivePart(event.type) || !event.runId) return { messages }
  const next = cloneMessagesForLiveEvent(messages)
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
    const next = cloneMessagesForLiveEvent(messages)
    const assistant = attachAssistant(next, event.runId, activeRunId)
    if (assistant) {
      assistant.tools ??= []
      foldToolEvent(assistant.tools, event)
    }
    return {
      messages: next,
      thinkingLabel: "Waiting for approval",
      pendingApproval: event,
      runId: event.runId,
      running: true
    }
  }
  if (event.type !== "approval.resolved") return null
  const next = cloneMessagesForLiveEvent(messages)
  const assistant = lastStreamingAssistant(next)
  if (assistant) {
    assistant.tools ??= []
    foldToolEvent(assistant.tools, event)
  }
  return { messages: next, pendingApproval: null }
}

function appendPromptTurn(messages: ThreadMessage[], prompt: string, runId: string): ThreadMessage[] {
  const text = prompt.trim()
  if (!text) return messages
  const lastUser = [...messages].reverse().find((row) => row.role === "user")
  if (lastUser?.content.trim() === text) return messages
  return [
    ...messages,
    { id: `msg_user_${runId}`, role: "user", content: text, createdAt: Date.now() }
  ]
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
    type === "mcp.app" ||
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

function cloneMessagesForLiveEvent(messages: ThreadMessage[]): ThreadMessage[] {
  if (messages.length === 0) return []
  const lastIndex = messages.length - 1
  const last = messages[lastIndex]
  if (last.role === "assistant" && last.streaming) {
    const clonedLast: ThreadMessage = {
      ...last,
      tools: last.tools?.map((tool) => ({ ...tool })) ?? [],
      sources: last.sources?.map((source) => ({ ...source })),
      assets: last.assets?.map((asset) => ({ ...asset })),
      actionChips: last.actionChips?.map((chip) => ({ ...chip })),
      mcpApps: last.mcpApps?.map((app) => ({ ...app }))
    }
    const next = messages.slice(0, lastIndex)
    next.push(clonedLast)
    return next
  }
  return [...messages]
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
  return messages.map((message) => {
    const chips =
      message.role === "assistant" ? takeActionChips(message.content, message.actionChips) : null
    return {
      ...message,
      content: chips ? chips.content : message.content,
      actionChips: chips && chips.chips.length > 0 ? chips.chips : message.actionChips,
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
    }
  })
}
