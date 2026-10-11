/**
 * 流式工具事件只能折进本轮助手行。
 * stub 重启后 toolCallId 会从 1 重数，禁止落到上一轮 restart_abandoned。
 */
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"
import type { ThreadMessage } from "./chat-store.types"

export function isTerminalRestartMessage(message: ThreadMessage): boolean {
  return (message.tools ?? []).some((tool) => toolHasResultCode(tool, RESTART_ABANDONED_CODE))
}

export function canFoldIntoAssistant(message: ThreadMessage, runId?: string): boolean {
  if (message.role !== "assistant") return false
  if (isTerminalRestartMessage(message)) return false
  const owned = message.runId?.trim()
  if (owned && runId && owned !== runId) return false
  return true
}

export function findAssistantForToolEvent(
  messages: ThreadMessage[],
  toolCallId: string,
  runId?: string
): ThreadMessage | undefined {
  const byId = messages.find(
    (message) =>
      canFoldIntoAssistant(message, runId) && message.tools?.some((tool) => tool.id === toolCallId)
  )
  if (byId) return byId
  const last = messages.at(-1)
  if (last?.streaming && canFoldIntoAssistant(last, runId)) return last
  return [...messages]
    .reverse()
    .find(
      (message) =>
        canFoldIntoAssistant(message, runId) &&
        message.tools?.some((tool) => tool.state === "approval-requested")
    )
}

export function foldAssistantIndex(
  messages: ThreadMessage[],
  toolCallId: string,
  runId?: string
): number {
  const target = findAssistantForToolEvent(messages, toolCallId, runId)
  return target ? messages.indexOf(target) : -1
}
