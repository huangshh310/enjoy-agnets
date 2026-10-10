/**
 * 把 ActiveRun 上累积的助手 transcript 写入 SQLite，并回写 runs.status。
 * 流式过程 checkpoint 同一行；complete / fail / abort / before-quit 再封口。
 */
import { updateRun } from "@enjoy-agents/db"
import { RESTORE_NO_MATCHING_CODE } from "@enjoy-agents/ipc-contract/restore-codes"
import { persistFinishedAssistant } from "./persist-parts"
import { flushPayloadFromRun } from "./agent-run-flush"
import { getDatabase } from "./database"
import { persistRunningCheckpoint } from "./persist-running-checkpoint"
import { persistWaitingRun } from "./persist-waiting-run"
import { persistRunUsageFromActive, markPumpMissingUsage, usageNeverRecorded } from "./run-usage"
import { listActiveRuns, type ActiveRun } from "./agent-run-state"
import { writeCancelledRestoreError } from "./restore-interrupted-running"
import { settlePendingApprovalsForRun } from "./settle-run-approvals"
export { shouldFlushRunsOnWindowAllClosed } from "./flush-on-window-all-closed"

const FINISHED = new Set(["completed", "failed", "cancelled"])

export type RunFlushStatus = "completed" | "failed" | "cancelled" | "waiting_review" | "running"

export type FlushActiveRunsOpts = {
  /** 只有真退出（will-quit / 非 darwin 关最后一扇窗）才 fail-closed。 */
  failClosed?: boolean
  persistWaiting?: (run: ActiveRun, runId: string) => void
  persistActive?: typeof persistActiveRun
  persistRunning?: (run: ActiveRun, runId: string) => void
}

export function persistActiveRun(
  run: ActiveRun,
  runId: string,
  status: RunFlushStatus,
  error?: string
): boolean {
  const wrote = writeAssistantRow(run)
  if (wrote) run.assistantPersisted = true
  updateRun(getDatabase(), runId, {
    status,
    error: error ?? null,
    ...(FINISHED.has(status) ? { checkpoint: null } : {})
  })
  if (FINISHED.has(status)) {
    run.endedAt = run.endedAt ?? Date.now()
    // 只给 completed 补 incomplete。failed/cancelled 且没泵过不得算 unknown；
    // 泵已开始但没 usage.updated 时，consumeRun.finally 已经标过。
    if (status === "completed" && usageNeverRecorded(run)) markPumpMissingUsage(run)
    persistRunUsageFromActive(runId, run)
  }
  return wrote
}

/**
 * 流式过程中覆盖同一条助手消息，不改 runs.status。
 * 进程被杀、electron-vite 重载没有 before-quit 时，hydrate 还能读到最后一次快照。
 */
export function checkpointActiveRun(run: ActiveRun): boolean {
  return writeAssistantRow(run)
}

function writeAssistantRow(run: ActiveRun): boolean {
  const runId = listActiveRuns().find((item) => item.run === run)?.runId
  const payload = flushPayloadFromRun({
    assistantPersisted: run.assistantPersisted,
    sessionId: run.input.sessionId,
    transcript: run.transcript,
    tools: run.tools,
    startedAt: run.startedAt,
    extras: { sources: run.citedSources },
    runKind: "agent",
    modelId: run.input.modelId,
    runtimeId: run.input.runtimeId,
    runId
  })
  if (!payload) return false
  try {
    const id = persistFinishedAssistant({
      ...payload,
      messageId: run.assistantMessageId
    })
    if (id) run.assistantMessageId = id
    return Boolean(id)
  } catch {
    return false
  }
}

/** 关窗口 / 退出时把还在跑或卡在审批的回复刷进库。 */
export function flushActiveRuns(opts: FlushActiveRunsOpts = {}): void {
  const persistWaiting = opts.persistWaiting ?? persistWaitingRun
  const persistActive = opts.persistActive ?? persistActiveRun
  const persistRunning = opts.persistRunning ?? persistRunningCheckpoint
  for (const { runId, run } of listActiveRuns()) {
    try {
      if (run.pendingApprovals.length > 0) {
        persistWaiting(run, runId)
        persistActive(run, runId, "waiting_review")
      } else {
        persistRunning(run, runId)
        persistActive(run, runId, "running")
      }
    } catch (error) {
      console.error("[flush] will-quit persist failed", { runId, error })
      if (opts.failClosed !== false && run.pendingApprovals.length > 0) {
        failClosedWaitingOnQuit(runId)
      }
    }
  }
}

/** will-quit 写检查点失败时不得留下 waiting_review + 未决 NULL。 */
function failClosedWaitingOnQuit(runId: string): void {
  settlePendingApprovalsForRun(runId, undefined, "restart")
  writeCancelledRestoreError(runId, RESTORE_NO_MATCHING_CODE)
}
