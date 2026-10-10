/**
 * 开会话时用 Inbox 活未决补回审批卡。回挂事件若在订阅前丢掉，卡与拍板仍对齐。
 */
import type { PendingApprovalItem, StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore, type ThreadMessage } from "../stores/chat-store"

export function pickLivePendingForSession(
  items: readonly PendingApprovalItem[] | undefined,
  sessionId: string
): PendingApprovalItem | undefined {
  return items?.find((item) => item.sessionId === sessionId)
}

export function argsForToolCall(
  messages: readonly Pick<ThreadMessage, "tools">[],
  toolCallId: string
): Record<string, unknown> {
  for (const message of messages) {
    const tool = message.tools?.find((item) => item.id === toolCallId)
    if (tool?.args && typeof tool.args === "object" && !Array.isArray(tool.args)) {
      return tool.args as Record<string, unknown>
    }
  }
  return {}
}

export function approvalRequiredFromPending(
  item: PendingApprovalItem,
  args: Record<string, unknown> = {}
): StreamEvent & { type: "approval.required" } {
  return {
    type: "approval.required",
    runId: item.runId,
    sessionId: item.sessionId,
    approvalId: item.id,
    toolCallId: item.toolCallId,
    name: item.name,
    args
  }
}

/** park / Attention 槽都没有卡时，用拍板 SQL 补一张可决策的卡。 */
export async function applyHydratedLivePending(sessionId: string): Promise<void> {
  const store = useChatStore.getState()
  if (store.sessionId !== sessionId || store.pendingApproval || !hasIde()) return
  try {
    const result = (await getIde().inbox.listPendingApprovals()) as {
      items?: PendingApprovalItem[]
    }
    if (useChatStore.getState().sessionId !== sessionId) return
    const item = pickLivePendingForSession(result.items, sessionId)
    if (!item) return
    const args = argsForToolCall(useChatStore.getState().messages, item.toolCallId)
    useChatStore.getState().applyStreamEvent(approvalRequiredFromPending(item, args))
  } catch {
    return
  }
}
