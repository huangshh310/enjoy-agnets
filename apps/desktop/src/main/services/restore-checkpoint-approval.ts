/**
 * 重启回挂：检查点里的 pending 对不上 HMAC 未决表时，按库行处理。
 * 禁止拿内部 id 回 SDK（#118）。已决回放必须走 planSdkReplay。
 * unsent / desktop_act allow 一律 fail closed，禁止直接写盘或重拍。
 */
import {
  getApproval,
  getRun,
  isSupersededSdkApprovalId,
  planSdkReplay,
  resolvedSdkApprovalId,
  type AppDatabase
} from "@enjoy-agents/db"
import type { BrowserWindow } from "electron"
import { deleteActiveRun, emitEvent, getActiveRun } from "./agent-run-state"
import { approvalResponseMessage } from "./approval-response-message"
import { recordSdkApprovalResponse } from "./approval-hmac"
import { getDatabase } from "./database"
import { settlePendingApprovalsForRun, RESTART_UNVERIFIABLE_DECISION } from "./settle-run-approvals"
import { persistSealedAssistantTools, writeCancelledRestoreError } from "./restore-interrupted-running"

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
}): {
  ended: boolean
  replies: Array<{ approvalId: string; approved: boolean; reason?: string }>
} {
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
      auditUnsentIfNeeded(item.approvalId)
      endRestoredRunWithoutSdkReply(input.runId, input.window)
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

/** unsent：决策未进 HMAC，只补审计，不改 decision。已有 sdkApproved 不盖。 */
export function auditUnsentIfNeeded(approvalId: string): void {
  const row = getApproval(getDatabase(), approvalId)
  if (!row || row.sdkApproved != null) return
  recordSdkApprovalResponse(approvalId, {
    approved: false,
    reason: RESTART_UNVERIFIABLE_DECISION
  })
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
  if (run) {
    const current = run.tools.find((tool) => tool.id === item.toolCallId)
    const next = {
      id: item.toolCallId,
      name: item.name,
      state: resolved.approved ? ("output-available" as const) : ("output-denied" as const),
      result: { decision: resolved.decision },
      errorText: resolved.approved ? undefined : resolved.reason
    }
    if (current) Object.assign(current, next)
    else run.tools.push(next)
  }
}

/** 回挂对不上：未决 cancelled（reason=restart），工具行 restart_abandoned，run 记停止。 */
export function endRestoredRunWithoutSdkReply(
  runId: string,
  window?: BrowserWindow,
  sessionId?: string
): void {
  const run = getActiveRun(runId)
  const target = window ?? run?.window
  const sid = sessionId ?? run?.input.sessionId
  settlePendingApprovalsForRun(runId, target, "restart")
  if (sid) {
    const createdAt = getRun(getDatabase(), runId)?.createdAt
    persistSealedAssistantTools(sid, createdAt != null ? { runCreatedAt: createdAt } : undefined)
  }
  writeCancelledRestoreError(runId, RESTORE_NO_MATCHING_CODE)
  if (target) {
    emitEvent(target, {
      type: "run.error",
      runId,
      sessionId: sessionId ?? run?.input.sessionId,
      message: RESTORE_NO_MATCHING_CODE,
      code: RESTORE_NO_MATCHING_CODE,
      turn: { workflow: "todo", attention: "neutral" }
    })
  }
  if (run) deleteActiveRun(runId)
}
