/**
 * runs / run_steps / approvals 仓储。
 */
import type { AppDatabase } from "../client"

export type RunRow = {
  id: string
  sessionId: string
  workspaceId: string | null
  kind: string
  status: string
  modelId: string | null
  providerId: string | null
  checkpoint: string | null
  error: string | null
  usageJson: string | null
  createdAt: number
  updatedAt: number
}

export function insertRun(
  db: AppDatabase,
  row: Omit<RunRow, "createdAt" | "updatedAt" | "usageJson"> & {
    createdAt?: number
    usageJson?: string | null
  }
): RunRow {
  const now = row.createdAt ?? Date.now()
  const record: RunRow = {
    ...row,
    usageJson: row.usageJson ?? null,
    createdAt: now,
    updatedAt: now
  }
  db.prepare(
    `INSERT INTO runs (id, session_id, workspace_id, kind, status, model_id, provider_id, checkpoint, error, usage_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.id,
    record.sessionId,
    record.workspaceId,
    record.kind,
    record.status,
    record.modelId,
    record.providerId,
    record.checkpoint,
    record.error,
    record.usageJson,
    record.createdAt,
    record.updatedAt
  )
  return record
}

export function updateRun(
  db: AppDatabase,
  id: string,
  patch: Partial<Pick<RunRow, "status" | "checkpoint" | "error" | "usageJson">>
): void {
  const current = getRun(db, id)
  if (!current) return
  db.prepare(
    "UPDATE runs SET status = ?, checkpoint = ?, error = ?, usage_json = ?, updated_at = ? WHERE id = ?"
  ).run(
    patch.status ?? current.status,
    patch.checkpoint === undefined ? current.checkpoint : patch.checkpoint,
    patch.error === undefined ? current.error : patch.error,
    patch.usageJson === undefined ? current.usageJson : patch.usageJson,
    Date.now(),
    id
  )
}

/** 低层：把 running 一律标 cancelled 并清 checkpoint。桌面层 abandonOrphanRuns 会先留下可续的工具边界快照。 */
export function abandonRunningRuns(
  db: AppDatabase,
  error = "Abandoned after process restart."
): number {
  const result = db
    .prepare("UPDATE runs SET status = ?, error = ?, checkpoint = NULL, updated_at = ? WHERE status = ?")
    .run("cancelled", error, Date.now(), "running")
  return Number(result.changes)
}

export function getRun(db: AppDatabase, id: string): RunRow | undefined {
  const row = db
    .prepare(
      `SELECT id, session_id as sessionId, workspace_id as workspaceId, kind, status,
              model_id as modelId, provider_id as providerId, checkpoint, error,
              usage_json as usageJson,
              created_at as createdAt, updated_at as updatedAt
       FROM runs WHERE id = ?`
    )
    .get(id) as RunRow | undefined
  return row
}

export function listRuns(
  db: AppDatabase,
  filter: { workspaceId?: string; sessionId?: string; kind?: string }
): RunRow[] {
  const clauses: string[] = []
  const params: string[] = []
  if (filter.workspaceId) {
    clauses.push("workspace_id = ?")
    params.push(filter.workspaceId)
  }
  if (filter.sessionId) {
    clauses.push("session_id = ?")
    params.push(filter.sessionId)
  }
  if (filter.kind) {
    clauses.push("kind = ?")
    params.push(filter.kind)
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
  return db
    .prepare(
      `SELECT id, session_id as sessionId, workspace_id as workspaceId, kind, status,
              model_id as modelId, provider_id as providerId, checkpoint, error,
              usage_json as usageJson,
              created_at as createdAt, updated_at as updatedAt
       FROM runs ${where} ORDER BY updated_at DESC`
    )
    .all(...params) as RunRow[]
}

export function insertRunStep(
  db: AppDatabase,
  step: {
    id: string
    runId: string
    idx: number
    label: string
    status: string
    inputSummary?: string
    outputSummary?: string
    durationMs?: number
    checkpointId?: string
    childRunId?: string
  }
): void {
  db.prepare(
    `INSERT INTO run_steps (id, run_id, idx, label, status, input_summary, output_summary, duration_ms, checkpoint_id, child_run_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    step.id,
    step.runId,
    step.idx,
    step.label,
    step.status,
    step.inputSummary ?? null,
    step.outputSummary ?? null,
    step.durationMs ?? null,
    step.checkpointId ?? null,
    step.childRunId ?? null,
    Date.now()
  )
}

export function listRunSteps(
  db: AppDatabase,
  runId: string
): Array<{
  id: string
  idx: number
  label: string
  status: string
  checkpointId: string | null
  childRunId: string | null
}> {
  return db
    .prepare(
      `SELECT id, idx, label, status, checkpoint_id as checkpointId, child_run_id as childRunId FROM run_steps WHERE run_id = ? ORDER BY idx ASC`
    )
    .all(runId) as Array<{
    id: string
    idx: number
    label: string
    status: string
    checkpointId: string | null
    childRunId: string | null
  }>
}

export function updateRunStepChildRunId(
  db: AppDatabase,
  stepId: string,
  childRunId: string | null
): void {
  db.prepare("UPDATE run_steps SET child_run_id = ? WHERE id = ?").run(childRunId, stepId)
}

/** 从指定步（含）开始删除持久化步骤记录，供「从某步重试」清掉过期行。 */
export function deleteRunStepsFrom(db: AppDatabase, runId: string, fromIdx: number): void {
  db.prepare("DELETE FROM run_steps WHERE run_id = ? AND idx >= ?").run(runId, fromIdx)
}

