/**
 * 把 ActiveRun 上累积的助手 transcript 写入 SQLite，并回写 runs.status。
 * complete / fail / abort / before-quit 都走这里，只落一次。
 */
import { updateRun } from "@enjoy-agents/db"
import { persistFinishedAssistant } from "./persist-parts"
import { flushPayloadFromRun } from "./agent-run-flush"
import { getDatabase } from "./database"
import { listActiveRuns, type ActiveRun } from "./agent-run-state"

export type RunFlushStatus = "completed" | "failed" | "cancelled"

export function persistActiveRun(
  run: ActiveRun,
  runId: string,
  status: RunFlushStatus,
  error?: string
): boolean {
  const payload = flushPayloadFromRun({
    assistantPersisted: run.assistantPersisted,
    sessionId: run.input.sessionId,
    transcript: run.transcript,
    tools: run.tools,
    startedAt: run.startedAt,
    extras: { sources: run.citedSources },
    runKind: "agent"
  })
  if (payload) {
    persistFinishedAssistant(payload)
    run.assistantPersisted = true
  }
  updateRun(getDatabase(), runId, { status, error: error ?? null })
  return Boolean(payload)
}

/** 关窗口 / 退出时把还在跑或卡在审批的回复刷进库。 */
export function flushActiveRuns(): void {
  for (const { runId, run } of listActiveRuns()) {
    persistActiveRun(run, runId, "cancelled")
  }
}
