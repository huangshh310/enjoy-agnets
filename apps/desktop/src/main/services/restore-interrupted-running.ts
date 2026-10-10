/**
 * running 中途被杀：不能判断工具有没有半执行，禁止重跑。
 * 启动时先封工具行，窗口起来再发回挂家族 run.error。
 * 工单走 decideTurnOutcome(sealed tools)，禁止无条件写成 todo。
 */
import type { BrowserWindow } from "electron"
import {
  parseAssistantPayload,
  sealAbandonedTools,
  serializeAssistantPayload
} from "@enjoy-agents/ipc-contract"
import { decideTurnOutcome, type TurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { RESTART_ABANDONED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import {
  isRestoreFamilyCode,
  RESTORE_INTERRUPTED_RUNNING,
  type RestoreFamilyCode
} from "@enjoy-agents/ipc-contract/restore-codes"
import { getRun, updateRun, type RunRow } from "@enjoy-agents/db"
import { emitEvent } from "./agent-run-state"
import { getDatabase } from "./database"
import { persistMessage } from "./persist-session"
import { persistSessionWorkflow } from "./apply-turn-outcome"
import { assistantBelongsToRun } from "./restore-assistant-snapshot"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"

const pendingEmit = new Map<string, TurnOutcome>()

export function queueInterruptedRunningSettle(row: RunRow): void {
  settlePendingApprovalsForRun(row.id, undefined, "restart")
  const original = persistSealedAssistantTools(row.sessionId, {
    runCreatedAt: row.createdAt,
    runId: row.id,
    restartNotice: RESTORE_INTERRUPTED_RUNNING
  })
  writeCancelledRestoreError(row.id, RESTORE_INTERRUPTED_RUNNING)
  const turn = decideTurnOutcome({ ended: "archive", tools: original })
  persistSessionWorkflow(row.sessionId, turn.workflow)
  pendingEmit.set(row.id, turn)
}

export function emitQueuedInterruptedRunning(window: BrowserWindow): void {
  const db = getDatabase()
  for (const [runId, turn] of pendingEmit) {
    const row = getRun(db, runId)
    if (!row) continue
    emitEvent(window, {
      type: "run.error",
      runId,
      sessionId: row.sessionId,
      message: RESTORE_INTERRUPTED_RUNNING,
      code: RESTORE_INTERRUPTED_RUNNING,
      turn
    })
  }
  pendingEmit.clear()
}

export function resetInterruptedRunningForTest(): void {
  pendingEmit.clear()
}

/** 库里已有原始异常时只记日志，禁止用回挂码盖掉 runs.error。 */
export function writeCancelledRestoreError(runId: string, restoreCode: string): void {
  const db = getDatabase()
  const existing = getRun(db, runId)?.error
  if (existing) {
    console.error("[restore] keep original run.error", { runId, existing, restore: restoreCode })
    updateRun(db, runId, { status: "cancelled", checkpoint: null })
    return
  }
  updateRun(db, runId, { status: "cancelled", error: restoreCode, checkpoint: null })
}

/** waiting 放弃与 running 中途共用：只封本轮助手行，返回封口前的工具给收工判定。 */
export function persistSealedAssistantTools(
  sessionId: string,
  opts?: { runCreatedAt?: number; runId?: string; restartNotice?: RestoreFamilyCode }
): Array<{ name: string; state?: string; result?: unknown; errorText?: string }> {
  const db = getDatabase()
  const latestUser = db
    .prepare(
      "SELECT created_at as createdAt FROM messages WHERE session_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as { createdAt: number } | undefined
  const rows = db
    .prepare(
      "SELECT id, content, created_at as createdAt FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC"
    )
    .all(sessionId) as Array<{ id: string; content: string; createdAt: number }>
  let original: Array<{ name: string; state?: string; result?: unknown; errorText?: string }> = []
  for (const row of rows) {
    const payload = parseAssistantPayload(row.content)
    if (
      !assistantBelongsToRun(row.createdAt, latestUser?.createdAt, opts?.runCreatedAt, {
        runId: opts?.runId,
        envelopeRunId: payload.runId
      })
    ) {
      continue
    }
    const tools = payload.tools ?? []
    if (original.length === 0) original = tools
    const sealed = sealAbandonedTools(tools, { code: RESTART_ABANDONED_CODE }) ?? tools
    const restartNotice = isRestoreFamilyCode(opts?.restartNotice)
      ? opts.restartNotice
      : isRestoreFamilyCode(payload.restartNotice)
        ? payload.restartNotice
        : undefined
    const next = { ...payload, tools: sealed, restartNotice }
    if (JSON.stringify(next) === JSON.stringify(payload)) continue
    persistMessage(sessionId, "assistant", serializeAssistantPayload(next), undefined, row.id)
  }
  return original
}
