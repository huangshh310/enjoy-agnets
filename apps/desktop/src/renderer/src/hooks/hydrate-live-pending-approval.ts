/**
 * 开会话时用 Inbox 活未决补回审批卡。回挂事件若在订阅前丢掉，卡与拍板仍对齐。
 * 参数只信 main 给的 HMAC 库拷贝；缺参不得猜线程 / {}。
 */
import type { ApprovalsPendingResult, PendingApprovalItem, StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { RESTORE_NO_MATCHING } from "../lib/usage/classify-thread-error"
import { useChatStore } from "../stores/chat-store"

export function pickLivePendingForSession(
  items: readonly PendingApprovalItem[] | undefined,
  sessionId: string
): PendingApprovalItem | undefined {
  let newest: PendingApprovalItem | undefined
  for (const item of items ?? []) {
    if (item.sessionId !== sessionId) continue
    if (!newest || item.createdAt > newest.createdAt) newest = item
  }
  return newest
}

export function hasDecidableApprovalArgs(args: unknown): boolean {
  return args != null
}

export function approvalRequiredFromPending(
  item: PendingApprovalItem
): (StreamEvent & { type: "approval.required" }) | null {
  if (!hasDecidableApprovalArgs(item.args)) return null
  return {
    type: "approval.required",
    runId: item.runId,
    sessionId: item.sessionId,
    approvalId: item.id,
    toolCallId: item.toolCallId,
    name: item.name,
    args: item.args
  }
}

function restoreNoMatchingEvent(runId: string, sessionId: string): StreamEvent {
  return {
    type: "run.error",
    runId,
    sessionId,
    message: RESTORE_NO_MATCHING,
    code: RESTORE_NO_MATCHING,
    turn: { workflow: "todo", attention: "stopped" }
  }
}

/** park / Attention 槽都没有卡时，用拍板 SQL 补一张可决策的卡。 */
export async function applyHydratedLivePending(sessionId: string): Promise<void> {
  const store = useChatStore.getState()
  if (store.sessionId !== sessionId || store.pendingApproval || !hasIde()) return
  try {
    const result = await waitForRestoreSettled()
    if (useChatStore.getState().sessionId !== sessionId) return
    if (!result.restoreSettled) return
    const item = pickLivePendingForSession(result.items, sessionId)
    if (!item) return
    const attached = await sessionRunAttached(sessionId, item.runId)
    if (useChatStore.getState().sessionId !== sessionId) return
    if (useChatStore.getState().pendingApproval) return
    if (!hasDecidableApprovalArgs(item.args)) {
      useChatStore.getState().applyStreamEvent(restoreNoMatchingEvent(item.runId, sessionId))
      return
    }
    if (!attached) return
    const card = approvalRequiredFromPending(item)
    if (!card) return
    useChatStore.getState().applyStreamEvent(card)
  } catch {
    return
  }
}

async function waitForRestoreSettled(): Promise<ApprovalsPendingResult> {
  let last: ApprovalsPendingResult = { items: [] }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    last = (await getIde().inbox.listPendingApprovals()) as ApprovalsPendingResult
    if (last.restoreSettled) return last
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return last
}

async function sessionRunAttached(sessionId: string, runId: string): Promise<boolean> {
  try {
    const active = (await getIde().agent.sessionActive({ sessionId })) as {
      runId?: string | null
      running?: boolean
    }
    return active?.running === true && active.runId === runId
  } catch {
    return false
  }
}
