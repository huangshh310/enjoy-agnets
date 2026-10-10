/**
 * running 中途被杀：不能判断工具有没有半执行，禁止重跑。
 * 启动时先封工具行，窗口起来再发回挂家族 run.error。
 */
import type { BrowserWindow } from "electron"
import {
  parseAssistantPayload,
  sealAbandonedTools,
  serializeAssistantPayload
} from "@enjoy-agents/ipc-contract"
import { RESTART_ABANDONED_CODE } from "@enjoy-agents/ipc-contract/desktop-notify"
import { RESTORE_INTERRUPTED_RUNNING } from "@enjoy-agents/ipc-contract/restore-codes"
import { getRun, updateRun, type RunRow } from "@enjoy-agents/db"
import { emitEvent } from "./agent-run-state"
import { getDatabase } from "./database"
import { persistMessage } from "./persist-session"
import { persistSessionWorkflow } from "./apply-turn-outcome"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"

const pendingEmit = new Set<string>()

export function queueInterruptedRunningSettle(row: RunRow): void {
  settlePendingApprovalsForRun(row.id, undefined, "restart")
  persistSealedAssistantTools(row.sessionId)
  writeCancelledRestoreError(row.id, RESTORE_INTERRUPTED_RUNNING)
  persistSessionWorkflow(row.sessionId, "todo")
  pendingEmit.add(row.id)
}

export function emitQueuedInterruptedRunning(window: BrowserWindow): void {
  const db = getDatabase()
  for (const runId of pendingEmit) {
    const row = getRun(db, runId)
    if (!row) continue
    emitEvent(window, {
      type: "run.error",
      runId,
      sessionId: row.sessionId,
      message: RESTORE_INTERRUPTED_RUNNING,
      code: RESTORE_INTERRUPTED_RUNNING,
      turn: { workflow: "todo", attention: "neutral" }
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
    updateRun(db, runId, { status: "cancelled" })
    return
  }
  updateRun(db, runId, { status: "cancelled", error: restoreCode })
}

function persistSealedAssistantTools(sessionId: string): void {
  const rows = getDatabase()
    .prepare(
      "SELECT id, content FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC"
    )
    .all(sessionId) as Array<{ id: string; content: string }>
  for (const row of rows) {
    const payload = parseAssistantPayload(row.content)
    const tools = payload.tools ?? []
    const sealed = sealAbandonedTools(tools, { code: RESTART_ABANDONED_CODE }) ?? tools
    if (JSON.stringify(sealed) === JSON.stringify(tools)) continue
    persistMessage(
      sessionId,
      "assistant",
      serializeAssistantPayload({ ...payload, tools: sealed }),
      undefined,
      row.id
    )
  }
}
