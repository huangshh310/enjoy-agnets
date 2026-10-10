/**
 * 归档前先 abort 该会话活泵，再把未决审批走普通 deny。
 * denyStored 只在 run 已不在内存时用；活泵 decide 失败必须抛，禁止绕过。
 */
import type { BrowserWindow } from "electron"
import { listPendingApprovals, listRuns, setApprovalDecision } from "@enjoy-agents/db"
import { decideApproval } from "./decide-approval"
import { abortActiveRunMemory, logCancelStreamError } from "./abort-active-run"
import { emitEvent, getActiveRun, listActiveRuns } from "./agent-run-state"
import { getDatabase } from "./database"
import { recordSdkApprovalResponse } from "./approval-hmac"
import { foldDeniedAssistantTool, sessionIdForRun } from "./fold-denied-assistant-tools"

type PendingDeny = { runId: string; approvalId: string; toolCallId: string }

export async function abortLiveRunsForSession(sessionId: string): Promise<void> {
  for (const { runId, run } of listActiveRuns()) {
    if (run.input.sessionId !== sessionId) continue
    abortActiveRunMemory(runId, { reason: "archive" })
    await cancelLiveStreamBestEffort(runId, sessionId)
  }
}

async function cancelLiveStreamBestEffort(runId: string, sessionId: string): Promise<void> {
  try {
    const { cancelCodingStream } = await import("./open-coding-stream")
    await cancelCodingStream(runId)
  } catch (error) {
    logCancelStreamError(error)
  }
  try {
    const { endDesktopActOverlay } = await import("./builtin-tools/desktop-overlay-chrome")
    const { cancelInFlightDesktopAct } = await import("./builtin-tools/computer-use/desktop-tools")
    endDesktopActOverlay()
    cancelInFlightDesktopAct({ runId, sessionId })
  } catch {
    // overlay 未装
  }
}

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
  if (run) {
    const target = window ?? run.window
    if (!target) throw new Error("Cannot deny a live approval without a window.")
    await decideApproval(target, {
      runId: item.runId,
      toolCallId: item.toolCallId,
      approvalId: item.approvalId,
      decision: "deny",
      reason: "Session archived."
    })
    return true
  }
  return denyStored(item, window)
}

function denyStored(item: PendingDeny, window?: BrowserWindow): boolean {
  const db = getDatabase()
  const still = listPendingApprovals(db, item.runId).some((row) => row.id === item.approvalId)
  if (!still) return false
  setApprovalDecision(db, item.approvalId, "deny")
  recordSdkApprovalResponse(item.approvalId, { approved: false, reason: "Session archived." })
  const sessionId = sessionIdForRun(item.runId)
  if (sessionId) {
    foldDeniedAssistantTool({
      sessionId,
      runId: item.runId,
      toolCallId: item.toolCallId
    })
  }
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
