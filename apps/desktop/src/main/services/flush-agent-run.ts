/**
 * 把 ActiveRun 上累积的助手 transcript 写入 SQLite，并回写 runs.status。
 * 流式过程 checkpoint 同一行；complete / fail / abort / before-quit 再封口。
 */
import { updateRun } from "@enjoy-agents/db"
import { persistFinishedAssistant } from "./persist-parts"
import { flushPayloadFromRun } from "./agent-run-flush"
import { getDatabase } from "./database"
import { persistRunningCheckpoint } from "./persist-running-checkpoint"
import { persistWaitingRun } from "./persist-waiting-run"
import { persistRunUsageFromActive, markPumpMissingUsage, usageNeverRecorded } from "./run-usage"
import { listActiveRuns, type ActiveRun } from "./agent-run-state"

const FINISHED = new Set(["completed", "failed", "cancelled"])

export type RunFlushStatus = "completed" | "failed" | "cancelled" | "waiting_review" | "running"

export function persistActiveRun(
  run: ActiveRun,
  runId: string,
  status: RunFlushStatus,
  error?: string
): boolean {
  const wrote = writeAssistantRow(run)
  if (wrote) run.assistantPersisted = true
  updateRun(getDatabase(), runId, { status, error: error ?? null })
  if (FINISHED.has(status)) {
    run.endedAt = run.endedAt ?? Date.now()
    if (usageNeverRecorded(run)) markPumpMissingUsage(run)
    persistRunUsageFromActive(runId, run)
  }
  return wrote
}

/**
 * 流式过程中覆盖同一条助手消息，不改 runs.status。
 * 进程被杀、electron-vite 重载没有 before-quit 时，hydrate 还能读到最后一次快照。
 */
export function checkpointActiveRun(run: ActiveRun): boolean {
  if (run.assistantPersisted) return false
  return writeAssistantRow(run)
}

function writeAssistantRow(run: ActiveRun): boolean {
  const payload = flushPayloadFromRun({
    assistantPersisted: run.assistantPersisted,
    sessionId: run.input.sessionId,
    transcript: run.transcript,
    tools: run.tools,
    startedAt: run.startedAt,
    extras: { sources: run.citedSources },
    runKind: "agent",
    modelId: run.input.modelId,
    runtimeId: run.input.runtimeId
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
export function flushActiveRuns(): void {
  for (const { runId, run } of listActiveRuns()) {
    try {
      if (run.pendingApprovals.length > 0) {
        persistActiveRun(run, runId, "waiting_review")
        persistWaitingRun(run, runId)
      } else {
        persistRunningCheckpoint(run, runId)
        persistActiveRun(run, runId, "running")
      }
    } catch {
      // 一条坏 JSON 不能挡住其它 run 落库。
    }
  }
}
