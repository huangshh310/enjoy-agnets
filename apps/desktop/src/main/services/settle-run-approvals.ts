/**
 * 跑被中止时结清未决审批：库写 cancelled，SDK approved:false，推 approval.resolved。
 * 与用户 deny 分开，工具行走已停止。
 */
import type { BrowserWindow } from "electron"
import { listPendingApprovals, listRuns, setApprovalDecision } from "@enjoy-agents/db"
import { foldToolEvent } from "@enjoy-agents/ipc-contract"
import { emitEvent, getActiveRun, listActiveRuns } from "./agent-run-state"
import { getDatabase } from "./database"
import { recordSdkApprovalResponse } from "./approval-hmac"
import { foldDeniedAssistantTool, sessionIdForRun } from "./fold-denied-assistant-tools"

export const RUN_STOPPED_REASON = "run_stopped"
export const APPROVAL_CANCELLED = "cancelled"

type PendingSettle = { runId: string; approvalId: string; toolCallId: string }

export function settlePendingApprovalsForRun(runId: string, window?: BrowserWindow): number {
  let settled = 0
  for (const item of collectPendingForRun(runId)) {
    if (settleOne(item, window)) settled += 1
  }
  const run = getActiveRun(runId)
  if (run) run.pendingApprovals = []
  return settled
}

export function settlePendingApprovalsForSession(sessionId: string, window?: BrowserWindow): number {
  let settled = 0
  for (const item of collectPendingForSession(sessionId)) {
    if (settleOne(item, window)) settled += 1
  }
  return settled
}

export function countPendingApprovalsForSession(sessionId: string): number {
  return collectPendingForSession(sessionId).length
}

function collectPendingForRun(runId: string): PendingSettle[] {
  const seen = new Set<string>()
  const out: PendingSettle[] = []
  const push = (item: PendingSettle) => {
    if (seen.has(item.approvalId)) return
    seen.add(item.approvalId)
    out.push(item)
  }
  const run = getActiveRun(runId)
  if (run) {
    for (const item of run.pendingApprovals) {
      push({ runId, approvalId: item.approvalId, toolCallId: item.toolCallId })
    }
  }
  for (const row of listPendingApprovals(getDatabase(), runId)) {
    push({ runId: row.runId, approvalId: row.id, toolCallId: row.toolCallId })
  }
  return out
}

function collectPendingForSession(sessionId: string): PendingSettle[] {
  const seen = new Set<string>()
  const out: PendingSettle[] = []
  const push = (item: PendingSettle) => {
    if (seen.has(item.approvalId)) return
    seen.add(item.approvalId)
    out.push(item)
  }
  for (const { runId, run } of listActiveRuns()) {
    if (run.input.sessionId !== sessionId) continue
    for (const item of run.pendingApprovals) {
      push({ runId, approvalId: item.approvalId, toolCallId: item.toolCallId })
    }
  }
  const db = getDatabase()
  for (const run of listRuns(db, { sessionId })) {
    for (const row of listPendingApprovals(db, run.id)) {
      push({ runId: row.runId, approvalId: row.id, toolCallId: row.toolCallId })
    }
  }
  return out
}

function settleOne(item: PendingSettle, window?: BrowserWindow): boolean {
  const db = getDatabase()
  const run = getActiveRun(item.runId)
  const inMemory = run?.pendingApprovals.some((pending) => pending.approvalId === item.approvalId)
  const inDb = listPendingApprovals(db, item.runId).some((row) => row.id === item.approvalId)
  if (!inMemory && !inDb) return false
  setApprovalDecision(db, item.approvalId, APPROVAL_CANCELLED)
  recordSdkApprovalResponse(item.approvalId, { approved: false, reason: RUN_STOPPED_REASON })
  run?.approvalGate.resolve(item.approvalId, "deny")
  const resolved = {
    type: "approval.resolved" as const,
    runId: item.runId,
    toolCallId: item.toolCallId,
    decision: APPROVAL_CANCELLED
  }
  if (run) {
    foldToolEvent(run.tools, resolved)
    run.pendingApprovals = run.pendingApprovals.filter((pending) => pending.approvalId !== item.approvalId)
  } else {
    const sessionId = sessionIdForRun(item.runId)
    if (sessionId) {
      foldDeniedAssistantTool({
        sessionId,
        runId: item.runId,
        toolCallId: item.toolCallId,
        decision: APPROVAL_CANCELLED
      })
    }
  }
  const target = window ?? run?.window
  if (target) emitEvent(target, resolved)
  return true
}
