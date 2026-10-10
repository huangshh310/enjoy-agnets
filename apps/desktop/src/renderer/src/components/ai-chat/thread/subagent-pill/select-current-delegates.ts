/**
 * 当前用户轮之后的顶层派工。没有用户轮或没有 delegate 时为空。
 * 嵌套子工具不算进药丸。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { isDelegateToolName } from "../thinking/agent-step-kind.ts"
import { inferSubagentKind, pickDelegateTitle } from "../thinking/delegate-step.ts"
import { mapToolStatus, mergeToolArgs } from "../thinking/extract-step-fields.ts"
import type { SubagentKind } from "../thinking/agent-step-tree.types.ts"

export type DelegatePillStatus = "pending" | "running" | "completed" | "error" | "denied" | "skipped"

export type DelegatePillItem = {
  id: string
  messageId: string
  title: string
  kind: SubagentKind
  status: DelegatePillStatus
}

type PillMessage = {
  id: string
  role: string
  tools?: ThreadToolCall[]
}

/** 只看最后一条用户消息之后的助手工具。 */
export function selectCurrentTurnDelegates(messages: PillMessage[]): DelegatePillItem[] {
  const start = lastUserIndex(messages)
  if (start < 0) return []
  const items: DelegatePillItem[] = []
  for (const message of messages.slice(start + 1)) {
    if (message.role !== "assistant") continue
    for (const tool of message.tools ?? []) {
      const item = toPillItem(message.id, tool)
      if (item) items.push(item)
    }
  }
  return items
}

function lastUserIndex(messages: PillMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return index
  }
  return -1
}

function toPillItem(messageId: string, tool: ThreadToolCall): DelegatePillItem | null {
  if (tool.parentToolCallId || !isDelegateToolName(tool.name)) return null
  const args = mergeToolArgs(tool)
  return {
    id: tool.id,
    messageId,
    title: pickDelegateTitle(args),
    kind: inferSubagentKind(args),
    status: mapToolStatus(tool.state, tool)
  }
}
