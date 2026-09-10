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
  createdAt: number
  updatedAt: number
}

export function insertRun(
  db: AppDatabase,
  row: Omit<RunRow, "createdAt" | "updatedAt"> & { createdAt?: number }
): RunRow {
  const now = row.createdAt ?? Date.now()
  const record: RunRow = {
    ...row,
    createdAt: now,
    updatedAt: now
  }
  db.prepare(
    `INSERT INTO runs (id, session_id, workspace_id, kind, status, model_id, provider_id, checkpoint, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    record.createdAt,
    record.updatedAt
  )
  return record
}

export function updateRun(
  db: AppDatabase,
  id: string,
  patch: Partial<Pick<RunRow, "status" | "checkpoint" | "error">>
): void {
  const current = getRun(db, id)
  if (!current) return
  db.prepare(
    "UPDATE runs SET status = ?, checkpoint = ?, error = ?, updated_at = ? WHERE id = ?"
  ).run(
    patch.status ?? current.status,
    patch.checkpoint === undefined ? current.checkpoint : patch.checkpoint,
    patch.error === undefined ? current.error : patch.error,
    Date.now(),
    id
  )
}

/** 低层：把 running 一律标 cancelled。桌面层 abandonOrphanRuns 会先留下可续的工具边界快照。 */
export function abandonRunningRuns(
  db: AppDatabase,
  error = "Abandoned after process restart."
): number {
  const result = db
    .prepare("UPDATE runs SET status = ?, error = ?, updated_at = ? WHERE status = ?")
    .run("cancelled", error, Date.now(), "running")
  return Number(result.changes)
}

export function getRun(db: AppDatabase, id: string): RunRow | undefined {
  const row = db
    .prepare(
      `SELECT id, session_id as sessionId, workspace_id as workspaceId, kind, status,
              model_id as modelId, provider_id as providerId, checkpoint, error,
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
  const rows = db
    .prepare(
      `SELECT id, session_id as sessionId, workspace_id as workspaceId, kind, status,
              model_id as modelId, provider_id as providerId, checkpoint, error,
              created_at as createdAt, updated_at as updatedAt
       FROM runs ORDER BY updated_at DESC`
    )
    .all() as RunRow[]
  return rows.filter((row) => {
    if (filter.workspaceId && row.workspaceId !== filter.workspaceId) return false
    if (filter.sessionId && row.sessionId !== filter.sessionId) return false
    if (filter.kind && row.kind !== filter.kind) return false
    return true
  })
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
  }
): void {
  db.prepare(
    `INSERT INTO run_steps (id, run_id, idx, label, status, input_summary, output_summary, duration_ms, checkpoint_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    Date.now()
  )
}

export function listRunSteps(
  db: AppDatabase,
  runId: string
): Array<{ id: string; idx: number; label: string; status: string; checkpointId: string | null }> {
  return db
    .prepare(
      `SELECT id, idx, label, status, checkpoint_id as checkpointId FROM run_steps WHERE run_id = ? ORDER BY idx ASC`
    )
    .all(runId) as Array<{
    id: string
    idx: number
    label: string
    status: string
    checkpointId: string | null
  }>
}
