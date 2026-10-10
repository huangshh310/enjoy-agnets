/**
 * 归档前先 abort 该会话活泵，再把未决审批结成 cancelled。
 * 活泵已在 abort 里结清；这里只收还停在库里的残留行。
 */
import type { BrowserWindow } from "electron"
import { abortActiveRunMemory, logCancelStreamError } from "./abort-active-run"
import { listActiveRuns } from "./agent-run-state"
import { settlePendingApprovalsForSession } from "./settle-run-approvals"

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
    endDesktopActOverlay({ runId, sessionId })
    cancelInFlightDesktopAct({ runId, sessionId })
  } catch {
    // overlay 未装
  }
}

export async function denyPendingApprovalsForSession(
  sessionId: string,
  window?: BrowserWindow
): Promise<number> {
  return settlePendingApprovalsForSession(sessionId, window)
}
