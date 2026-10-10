/**
 * 重启回挂：检查点里的 pending 对不上 HMAC 未决表时，按库行处理。
 * 禁止拿内部 id 回 SDK（#118）。
 */
import {
  getApproval,
  isSupersededSdkApprovalId,
  resolvedSdkApprovalId,
  updateRun,
  type AppDatabase
} from "@enjoy-agents/db"
import type { BrowserWindow } from "electron"
import { deleteActiveRun, emitEvent, getActiveRun } from "./agent-run-state"
import { approvalResponseMessage } from "./approval-response-message"
import { getDatabase } from "./database"

export const RESTORE_NO_MATCHING_APPROVAL = "No matching tool approval is waiting."

export type RestoredOrphan =
  | {
      kind: "replay"
      sdkApprovalId: string
      approved: boolean
      decision: string
      reason?: string
      resumeCode?: string | null
    }
  | { kind: "skip" }
  | { kind: "fail_closed" }

export function resolveRestoredOrphanApproval(db: AppDatabase, approvalId: string): RestoredOrphan {
  const row = getApproval(db, approvalId)
  if (!row) return { kind: "fail_closed" }
  if (isSupersededSdkApprovalId(row.sdkApprovalId)) return { kind: "skip" }
  if (row.decision == null) return { kind: "fail_closed" }
  return {
    kind: "replay",
    sdkApprovalId: resolvedSdkApprovalId(row),
    approved: row.sdkApproved === 1,
    decision: row.decision,
    reason: row.sdkReason ?? undefined,
    resumeCode: row.resumeCode
  }
}

export function applyRestoredOrphanApprovals(input: {
  runId: string
  items: Array<{ approvalId: string; toolCallId: string; name: string }>
  window?: BrowserWindow
}): { ended: boolean; replies: Array<{ approvalId: string; approved: boolean; reason?: string }> } {
  const db = getDatabase()
  const replies: Array<{ approvalId: string; approved: boolean; reason?: string }> = []
  for (const item of input.items) {
    const resolved = resolveRestoredOrphanApproval(db, item.approvalId)
    if (resolved.kind === "skip") continue
    if (resolved.kind === "fail_closed") {
      endRestoredRunWithoutSdkReply(db, input.runId, input.window)
      return { ended: true, replies }
    }
    replies.push({
      approvalId: resolved.sdkApprovalId,
      approved: resolved.approved,
      reason: resolved.reason
    })
    replayStoredSdkResponse(input.runId, item, resolved, input.window)
  }
  return { ended: false, replies }
}

function replayStoredSdkResponse(
  runId: string,
  item: { toolCallId: string; name: string },
  resolved: Extract<RestoredOrphan, { kind: "replay" }>,
  window?: BrowserWindow
): void {
  const run = getActiveRun(runId)
  run?.messages.push(
    approvalResponseMessage({
      approvalId: resolved.sdkApprovalId,
      approved: resolved.approved,
      reason: resolved.reason
    })
  )
  const target = window ?? run?.window
  if (!target) return
  emitEvent(target, {
    type: "tool.result",
    runId,
    toolCallId: item.toolCallId,
    name: item.name,
    result: {
      decision: resolved.decision,
      ...(resolved.resumeCode ? { code: resolved.resumeCode } : {})
    },
    error: resolved.approved ? undefined : resolved.reason
  })
}

function endRestoredRunWithoutSdkReply(db: AppDatabase, runId: string, window?: BrowserWindow): void {
  updateRun(db, runId, { status: "cancelled", error: RESTORE_NO_MATCHING_APPROVAL })
  const run = getActiveRun(runId)
  const target = window ?? run?.window
  if (run) deleteActiveRun(runId)
  if (target) {
    emitEvent(target, {
      type: "run.error",
      runId,
      message: RESTORE_NO_MATCHING_APPROVAL
    })
  }
}
