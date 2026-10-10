/**
 * Inbox 行 → 合约项：args 只用库里 HMAC 拷贝，剔 park 字段，禁止猜 {}。
 */
import { stripParkEnrichedFields, type LivePendingApproval } from "@enjoy-agents/db"
import type { PendingApprovalItem } from "@enjoy-agents/ipc-contract"
import { parseStoredApprovalArgs } from "./restore-approval-args"

export function mapLivePendingItem(row: LivePendingApproval): PendingApprovalItem {
  const item: PendingApprovalItem = {
    id: row.id,
    runId: row.runId,
    sessionId: row.sessionId,
    workspaceId: row.workspaceId,
    sessionTitle: row.sessionTitle,
    name: row.name,
    toolCallId: row.toolCallId,
    createdAt: row.createdAt
  }
  const parsed = parseStoredApprovalArgs({ args: row.args, requestArgs: row.requestArgs })
  if (parsed == null) return item
  return { ...item, args: stripParkEnrichedFields(parsed) }
}
