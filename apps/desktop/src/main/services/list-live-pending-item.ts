/**
 * Inbox 行 → 合约项：args 优先内存 pending（含 desktop_act 提示），否则 HMAC 库拷贝。
 */
import { stripParkEnrichedFields, type LivePendingApproval } from "@enjoy-agents/db"
import {
  parsePendingApprovalArgs,
  type PendingApprovalItem
} from "@enjoy-agents/ipc-contract/approvals-pending"
import { getActiveRun } from "./agent-run-state"
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
  const args = pickPendingArgs(row)
  if (args === undefined) return item
  return { ...item, args }
}

function pickPendingArgs(row: LivePendingApproval): unknown | undefined {
  const memory = memoryPendingArgs(row.runId, row.id)
  if (memory !== undefined) {
    const capped = parsePendingApprovalArgs(memory)
    if (capped !== undefined) return capped
  }
  const parsed = parseStoredApprovalArgs({ args: row.args, requestArgs: row.requestArgs })
  if (parsed == null) return undefined
  return parsePendingApprovalArgs(stripParkEnrichedFields(parsed))
}

function memoryPendingArgs(runId: string, approvalId: string): unknown | undefined {
  const pending = getActiveRun(runId)?.pendingApprovals.find((item) => item.approvalId === approvalId)
  return pending?.args
}
