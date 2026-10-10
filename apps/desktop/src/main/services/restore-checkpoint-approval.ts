/**
 * 重启回挂：检查点里的 pending 对不上 HMAC 未决表时，按库行处理。
 * 禁止拿内部 id 回 SDK（#118）。已决回放必须走 planSdkReplay。
 */
import {
  getApproval,
  getRun,
  isSupersededSdkApprovalId,
  planSdkReplay,
  resolvedSdkApprovalId,
  updateRun,
  type AppDatabase
} from "@enjoy-agents/db"
import type { BrowserWindow } from "electron"
import { deleteActiveRun, emitEvent, getActiveRun } from "./agent-run-state"
import { approvalResponseMessage } from "./approval-response-message"
import { getDatabase } from "./database"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"

/** 无匹配行 / planSdkReplay fail closed：机器码，禁止英文句子进 run.error。 */
export const RESTORE_NO_MATCHING_CODE = "restore_no_matching_approval"

export type RestoredOrphan =
  | {
      kind: "replay"
      sdkApprovalId: string
      approved: boolean
      decision: string
      reason?: string
    }
  | { kind: "skip" }
  | { kind: "fail_closed" }

export function resolveRestoredOrphanApproval(
  db: AppDatabase,
  input: { approvalId: string; runId: string; toolCallId: string }
): RestoredOrphan {
  const row = getApproval(db, input.approvalId)
  if (!row) return { kind: "fail_closed" }
  if (isSupersededSdkApprovalId(row.sdkApprovalId)) return { kind: "skip" }
  if (row.runId !== input.runId || row.toolCallId !== input.toolCallId) {
    return { kind: "fail_closed" }
  }
  const decision = row.decision ?? "deny"
  const plan = planSdkReplay(row, row.id, resolvedSdkApprovalId(row), decision)
  if (plan.action === "replay") {
    return {
      kind: "replay",
      sdkApprovalId: plan.sdkApprovalId,
      approved: plan.approved,
      decision: plan.decision,
      reason: plan.reason
    }
  }
  return { kind: "fail_closed" }
}

export function applyRestoredOrphanApprovals(input: {
  runId: string
  items: Array<{ approvalId: string; toolCallId: string; name: string }>
  window?: BrowserWindow
}): { ended: boolean; replies: Array<{ approvalId: string; approved: boolean; reason?: string }> } {
  const db = getDatabase()
  const replies: Array<{ approvalId: string; approved: boolean; reason?: string }> = []
  for (const item of input.items) {
    const resolved = resolveRestoredOrphanApproval(db, {
      approvalId: item.approvalId,
      runId: input.runId,
      toolCallId: item.toolCallId
    })
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
    result: { decision: resolved.decision },
    error: resolved.approved ? undefined : resolved.reason
  })
}

/** 回挂对不上：未决 cancelled（reason=restart），run 记停止，不写 failed。 */
export function endRestoredRunWithoutSdkReply(
  db: AppDatabase,
  runId: string,
  window?: BrowserWindow,
  sessionId?: string
): void {
  const run = getActiveRun(runId)
  const target = window ?? run?.window
  settlePendingApprovalsForRun(runId, target, "restart")
  writeCancelledRestoreError(db, runId)
  if (target) {
    emitEvent(target, {
      type: "run.error",
      runId,
      sessionId: sessionId ?? run?.input.sessionId,
      message: RESTORE_NO_MATCHING_CODE,
      code: RESTORE_NO_MATCHING_CODE,
      turn: { workflow: "todo", attention: "stopped" }
    })
  }
  if (run) deleteActiveRun(runId)
}

/** 库里已有原始异常时只记日志，禁止用回挂码盖掉 runs.error。 */
function writeCancelledRestoreError(db: AppDatabase, runId: string): void {
  const existing = getRun(db, runId)?.error
  if (existing) {
    console.error("[restore] keep original run.error", { runId, existing, restore: RESTORE_NO_MATCHING_CODE })
    updateRun(db, runId, { status: "cancelled" })
    return
  }
  updateRun(db, runId, { status: "cancelled", error: RESTORE_NO_MATCHING_CODE })
}
