/**
 * 将主进程流式事件折叠进当前会话消息：
 * 累积回答文本、思考轨迹与工具调用，供对话线程按部件渲染。
 */
import {
  absorbTextDelta,
  clampThoughtSeconds,
  foldToolEvent,
  sealAbandonedTools,
  takeActionChips,
  type StreamEvent
} from "@enjoy-agents/ipc-contract"
import { isApprovalNotExecutedMessage } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { CATCH_UP_APPROVAL_TIMEOUT } from "@enjoy-agents/ipc-contract/automations-missed"
import { ChatSendErrorCode } from "@enjoy-agents/ipc-contract/chat-readiness"
import { rollbackPreOutputTurn, shouldRollbackPreOutput } from "./pre-output-rollback"
import { isUserAbortEvent, USER_ABORTED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { applyV2Part } from "./apply-v2-parts"
import type { ThreadMessage } from "./chat-store"
import {
  canOpenAssistantTurn,
  isComposerRunStart,
  isForeignRunId,
  shouldFinalizeComposerRun
} from "./stream-run-scope"
import { lastUserText } from "./drop-pre-output-turn"

export type StreamPatch = {
  messages: ThreadMessage[]
  thinkingLabel?: string
  pendingApproval?: (StreamEvent & { type: "approval.required" }) | null
  running?: boolean
  runId?: string | null
  error?: string | null
  notice?: string | null
  composer?: string
  /** 消息还没回灌：先挂住，applySessionHydrate 后再折。 */
  heldResolved?: StreamEvent & { type: "approval.resolved" }
}

export function reduceStreamEvent(
  messages: ThreadMessage[],
  event: StreamEvent,
  activeRunId: string | null = null
): StreamPatch {
  if (event.type === "run.start") {
    if (isForeignRunId(event.runId, activeRunId)) return { messages }
    if (activeRunId !== event.runId && !isComposerRunStart(event)) return { messages }
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
  if (event.type === "tool.result" || event.type === "tool.start" || event.type === "tool.args.delta") {
    const next = cloneMessagesForToolEvent(messages, event.toolCallId)
    const assistant =
      findAssistantForResolved(next, event.toolCallId) ?? attachAssistant(next, event.runId, activeRunId)
    if (!assistant) return { messages }
    return applyLiveEvent(next, assistant, event)
  }
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
  if (event.type === "run.error") {
    const preOutput = applyUnclaimedPreOutputError(messages, event, activeRunId)
    if (preOutput) return preOutput
  }
  if (!shouldFinalizeComposerRun(event.runId, activeRunId)) return { messages }
  if (event.type === "run.error") {
    if (isApprovalNotExecutedMessage(event.message)) {
      return { messages: finalizeRun(messages), pendingApproval: null, running: false, runId: null, error: null }
    }
    if (isUserAbortEvent(event)) {
      return {
        messages: finalizeRun(messages, { aborted: true }),
        pendingApproval: null,
        running: false,
        runId: null,
        error: null,
        notice: USER_ABORTED_CODE
      }
    }
    if (event.message === CATCH_UP_APPROVAL_TIMEOUT) {
      return {
        messages: finalizeRun(messages),
        pendingApproval: null,
        running: false,
        runId: null,
        error: null,
        notice: CATCH_UP_APPROVAL_TIMEOUT
      }
    }
    const code = chatSendErrorCodeOf(event)
    if (shouldRollbackPreOutput({ preOutput: event.preOutput, code }, messages)) {
      return rolledPreOutputPatch(messages, code ?? event.message, event.preOutput === true)
    }
    const lastUser = lastUserText(messages)
    return {
      messages: finalizeRun(messages),
      running: false,
      error: code ?? event.message,
      ...(code && lastUser ? { composer: lastUser } : {})
    }
  }
  return { messages: finalizeRun(messages), pendingApproval: null, running: false, runId: null, error: null }
}

/** agent.run 返回前 runId 还空：出字前失败仍要撕泡还草稿。 */
function applyUnclaimedPreOutputError(
  messages: ThreadMessage[],
  event: StreamEvent & { type: "run.error" },
  activeRunId: string | null
): StreamPatch | null {
  if (activeRunId && activeRunId !== event.runId) return null
  const code = chatSendErrorCodeOf(event)
  if (!shouldRollbackPreOutput({ preOutput: event.preOutput, code }, messages)) return null
  return rolledPreOutputPatch(messages, code ?? event.message, event.preOutput === true)
}

function rolledPreOutputPatch(
  messages: ThreadMessage[],
  error: string,
  dropAssistant = false
): StreamPatch {
  const draft = lastUserText(messages)
  const rolled = rollbackPreOutputTurn(messages, { dropAssistant })
  return {
    messages: rolled.messages,
    pendingApproval: null,
    running: false,
    runId: null,
    error,
    composer: rolled.composer || draft
  }
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
  const next = cloneMessagesForToolEvent(messages, event.toolCallId)
  const assistant = findAssistantForResolved(next, event.toolCallId)
  if (!assistant) {
    return { messages, pendingApproval: null, heldResolved: event }
  }
  assistant.tools ??= []
  foldToolEvent(assistant.tools, event)
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

function cloneMessagesForToolEvent(messages: ThreadMessage[], toolCallId: string): ThreadMessage[] {
  const index = messages.findIndex(
    (message) => message.role === "assistant" && message.tools?.some((tool) => tool.id === toolCallId)
  )
  const target = index >= 0 ? index : lastAssistantIndex(messages)
  if (target < 0) return [...messages]
  return messages.map((message, at) => {
    if (at !== target) return message
    return {
      ...message,
      tools: message.tools?.map((tool) => ({ ...tool })) ?? []
    }
  })
}

function findAssistantForResolved(messages: ThreadMessage[], toolCallId: string): ThreadMessage | undefined {
  const byId = messages.find(
    (message) => message.role === "assistant" && message.tools?.some((tool) => tool.id === toolCallId)
  )
  if (byId) return byId
  return [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" && message.tools?.some((tool) => tool.state === "approval-requested")
    )
}

function lastAssistantIndex(messages: ThreadMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") return index
  }
  return -1
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

function chatSendErrorCodeOf(event: { code?: string; message: string }): string | null {
  const fromCode = ChatSendErrorCode.safeParse(event.code)
  if (fromCode.success) return fromCode.data
  const fromMessage = ChatSendErrorCode.safeParse(event.message)
  return fromMessage.success ? fromMessage.data : null
}

function finalizeRun(messages: ThreadMessage[], opts?: { aborted?: boolean }): ThreadMessage[] {
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
      tools: sealAbandonedTools(
        message.tools?.map((tool) => ({ ...tool })),
        { aborted: opts?.aborted }
      )
    }
  })
}
