/**
 * 开会话时用 Inbox 活未决补回审批卡。回挂事件若在订阅前丢掉，卡与拍板仍对齐。
 * 参数只信 main 给的内存 pending 或 HMAC 库拷贝；缺参不得猜线程 / {}，也不自造 run.error。
 */
import {
  parseInboxPendingItems,
  type ApprovalsPendingResult,
  type PendingApprovalItem
} from "@enjoy-agents/ipc-contract/approvals-pending"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
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
    // 缺参交给 main 回挂 fail-closed，禁止 renderer 自造 run.error。
    if (!hasDecidableApprovalArgs(item.args) || !attached) return
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
    last = parseHydratedPendingResult(await getIde().inbox.listPendingApprovals())
    if (last.restoreSettled) return last
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return last
}

function parseHydratedPendingResult(raw: unknown): ApprovalsPendingResult {
  if (!raw || typeof raw !== "object") return { items: [] }
  const record = raw as { items?: unknown; restoreSettled?: unknown }
  return {
    items: parseInboxPendingItems(record.items),
    restoreSettled: record.restoreSettled === true
  }
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
