/**
 * 重启回挂：检查点里的 pending 对不上 HMAC 未决表时，按库行处理。
 * 禁止拿内部 id 回 SDK（#118）。已决回放必须走 planSdkReplay。
 */
import {
  getApproval,
  isSupersededSdkApprovalId,
  planSdkReplay,
  resolvedSdkApprovalId,
  type AppDatabase
} from "@enjoy-agents/db"
import type { BrowserWindow } from "electron"
import { deleteActiveRun, emitEvent, getActiveRun } from "./agent-run-state"
import { approvalResponseMessage } from "./approval-response-message"
import { getDatabase } from "./database"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"
import { writeCancelledRestoreError } from "./restore-interrupted-running"

type RestoredAllow = {
  approvalId: string
  toolCallId: string
  name: string
  args?: unknown
}

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
  | {
      kind: "continue_decided"
      approved: boolean
      decision: string
    }
  | { kind: "desktop_reverify" }
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
  // 已决但 SDK 没发出（kill-9 在 execute 前）：文件/命令续跑；desktop_act allow 必须先重拍。
  if (
    (row.decision === "allow" || row.decision === "deny") &&
    plan.action === "fail_closed" &&
    plan.cause === "unsent"
  ) {
    if (row.name === "desktop_act" && row.decision === "allow") {
      return { kind: "desktop_reverify" }
    }
    return { kind: "continue_decided", approved: row.decision === "allow", decision: row.decision }
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
  continueAllows: RestoredAllow[]
  desktopReverify: RestoredAllow[]
} {
  const db = getDatabase()
  const replies: Array<{ approvalId: string; approved: boolean; reason?: string }> = []
  const continueAllows: RestoredAllow[] = []
  const desktopReverify: RestoredAllow[] = []
  for (const item of input.items) {
    const resolved = resolveRestoredOrphanApproval(db, {
      approvalId: item.approvalId,
      runId: input.runId,
      toolCallId: item.toolCallId
    })
    if (resolved.kind === "skip") continue
    if (resolved.kind === "fail_closed") {
      endRestoredRunWithoutSdkReply(db, input.runId, input.window)
      return { ended: true, replies, continueAllows, desktopReverify }
    }
    if (resolved.kind === "desktop_reverify") {
      const row = getApproval(db, item.approvalId)
      desktopReverify.push({
        approvalId: item.approvalId,
        toolCallId: item.toolCallId,
        name: item.name,
        args: row ? (parseStoredApprovalArgs(row) ?? undefined) : undefined
      })
      continue
    }
    if (resolved.kind === "continue_decided") {
      replies.push({
        approvalId: item.approvalId,
        approved: resolved.approved,
        reason: resolved.decision
      })
      if (resolved.approved) {
        const row = getApproval(db, item.approvalId)
        continueAllows.push({
          approvalId: item.approvalId,
          toolCallId: item.toolCallId,
          name: item.name,
          args: row ? (parseStoredApprovalArgs(row) ?? undefined) : undefined
        })
      }
      continue
    }
    replies.push({
      approvalId: resolved.sdkApprovalId,
      approved: resolved.approved,
      reason: resolved.reason
    })
    replayStoredSdkResponse(input.runId, item, resolved, input.window)
  }
  return { ended: false, replies, continueAllows, desktopReverify }
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
  _db: AppDatabase,
  runId: string,
  window?: BrowserWindow,
  sessionId?: string
): void {
  const run = getActiveRun(runId)
  const target = window ?? run?.window
  settlePendingApprovalsForRun(runId, target, "restart")
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

