/**
 * 归档前把该会话未决审批走一遍普通 deny（与 Dock 点拒绝同一条 decide 路）。
 */
import type { BrowserWindow } from "electron"
import { listPendingApprovals, listRuns, setApprovalDecision } from "@enjoy-agents/db"
import { decideApproval } from "./decide-approval"
import { emitEvent, getActiveRun, listActiveRuns } from "./agent-run-state"
import { getDatabase } from "./database"
import { recordSdkApprovalResponse } from "./approval-hmac"

type PendingDeny = { runId: string; approvalId: string; toolCallId: string }

export async function denyPendingApprovalsForSession(
  sessionId: string,
  window?: BrowserWindow
): Promise<number> {
  const pending = collectPending(sessionId)
  let denied = 0
  for (const item of pending) {
    if (await denyOne(item, window)) denied += 1
  }
  return denied
}

function collectPending(sessionId: string): PendingDeny[] {
  const seen = new Set<string>()
  const out: PendingDeny[] = []
  const push = (item: PendingDeny) => {
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

async function denyOne(item: PendingDeny, window?: BrowserWindow): Promise<boolean> {
  const run = getActiveRun(item.runId)
  const target = window ?? run?.window
  if (run && target) {
    try {
      await decideApproval(target, {
        runId: item.runId,
        toolCallId: item.toolCallId,
        approvalId: item.approvalId,
        decision: "deny",
        reason: "Session archived."
      })
      return true
    } catch {
      // 活泵已走掉：落到库行兜底。
    }
  }
  return denyStored(item, target)
}

function denyStored(item: PendingDeny, window?: BrowserWindow): boolean {
  const db = getDatabase()
  const still = listPendingApprovals(db, item.runId).some((row) => row.id === item.approvalId)
  if (!still) return false
  setApprovalDecision(db, item.approvalId, "deny")
  recordSdkApprovalResponse(item.approvalId, { approved: false, reason: "Session archived." })
  if (window) {
    emitEvent(window, {
      type: "approval.resolved",
      runId: item.runId,
      toolCallId: item.toolCallId,
      decision: "deny"
    })
  }
  return true
}
