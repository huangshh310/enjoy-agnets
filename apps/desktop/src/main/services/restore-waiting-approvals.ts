/**
 * 重启回挂：先处理孤儿 / fail closed，活下来才发卡。
 */
import type { BrowserWindow } from "electron"
import { resolvedSdkApprovalId, setApprovalDecision, type ApprovalRow } from "@enjoy-agents/db"
import { emitEvent, getActiveRun } from "./agent-run-state"
import { approvalResponseMessage } from "./approval-response-message"
import { recordSdkApprovalResponse } from "./approval-hmac"
import { getDatabase } from "./database"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { applyRestoredOrphanApprovals } from "./restore-checkpoint-approval"
import { APPROVAL_ARGS_MISSING, APPROVAL_ARGS_MISSING_MESSAGE } from "./resolve-approval-args"
import type { PendingApproval } from "./consume-stream"

export function restoreHeldWaitingApprovals(input: {
  runId: string
  hmacPending: ApprovalRow[]
  items: PendingApproval[]
  window: BrowserWindow
}): { ended: boolean; keep: PendingApproval[] } {
  const classified = classifyWaitingApprovals(input.hmacPending, input.items)
  const orphaned = applyRestoredOrphanApprovals({
    runId: input.runId,
    items: classified.orphans,
    window: input.window
  })
  if (orphaned.ended) return { ended: true, keep: [] }
  denyMissingArgApprovals(input.runId, classified.missingArgs, input.window)
  emitRestoredApprovalCards(input.runId, classified.keep, input.window)
  return { ended: false, keep: classified.keep }
}

function classifyWaitingApprovals(
  hmacPending: ApprovalRow[],
  items: PendingApproval[]
): {
  keep: PendingApproval[]
  missingArgs: Array<{ item: PendingApproval; row: ApprovalRow }>
  orphans: PendingApproval[]
} {
  const keep: PendingApproval[] = []
  const missingArgs: Array<{ item: PendingApproval; row: ApprovalRow }> = []
  const orphans: PendingApproval[] = []
  for (const item of items) {
    const row = hmacPending.find((approval) => approval.id === item.approvalId)
    const args = parseStoredApprovalArgs(row)
    if (args != null) keep.push({ ...item, args })
    else if (row) missingArgs.push({ item, row })
    else orphans.push(item)
  }
  return { keep, missingArgs, orphans }
}

function denyMissingArgApprovals(
  runId: string,
  missingArgs: Array<{ item: PendingApproval; row: ApprovalRow }>,
  window: BrowserWindow
): void {
  const db = getDatabase()
  const run = getActiveRun(runId)
  for (const { item, row } of missingArgs) {
    setApprovalDecision(db, row.id, "deny")
    recordSdkApprovalResponse(row.id, {
      approved: false,
      reason: APPROVAL_ARGS_MISSING_MESSAGE,
      resumeCode: APPROVAL_ARGS_MISSING
    })
    run?.messages.push(
      approvalResponseMessage({
        approvalId: resolvedSdkApprovalId(row),
        approved: false,
        reason: APPROVAL_ARGS_MISSING_MESSAGE
      })
    )
    emitEvent(window, {
      type: "tool.result",
      runId,
      toolCallId: item.toolCallId,
      name: item.name,
      result: { code: APPROVAL_ARGS_MISSING },
      error: APPROVAL_ARGS_MISSING_MESSAGE
    })
  }
}

function emitRestoredApprovalCards(
  runId: string,
  keep: PendingApproval[],
  window: BrowserWindow
): void {
  for (const item of keep) {
    emitEvent(window, {
      type: "approval.required",
      runId,
      approvalId: item.approvalId,
      toolCallId: item.toolCallId,
      name: item.name,
      args: item.args ?? {}
    })
  }
}
