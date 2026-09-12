/**
 * 本地 telemetry 指标仓储。
 */
import type { AppDatabase } from "../client"

export type MetricRow = {
  id: string
  runId: string
  kind: string
  modelId: string | null
  status: string
  inputTokens: number | null
  outputTokens: number | null
  durationMs: number | null
  ttfoMs: number | null
  tokensPerSecond: number | null
  errorClass: string | null
  createdAt: number
}

export function insertMetric(db: AppDatabase, row: MetricRow): void {
  db.prepare(
    `INSERT INTO telemetry_metrics
      (id, run_id, kind, model_id, status, input_tokens, output_tokens, duration_ms, ttfo_ms, tokens_per_second, error_class, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.runId,
    row.kind,
    row.modelId,
    row.status,
    row.inputTokens,
    row.outputTokens,
    row.durationMs,
    row.ttfoMs,
    row.tokensPerSecond,
    row.errorClass,
    row.createdAt
  )
}

export function listMetrics(
  db: AppDatabase,
  filter: { runId?: string; kind?: string; since?: number; limit: number }
): MetricRow[] {
  const rows = db
    .prepare(
      `SELECT id, run_id as runId, kind, model_id as modelId, status,
              input_tokens as inputTokens, output_tokens as outputTokens,
              duration_ms as durationMs, ttfo_ms as ttfoMs,
              tokens_per_second as tokensPerSecond, error_class as errorClass,
              created_at as createdAt
       FROM telemetry_metrics
       WHERE (? IS NULL OR created_at >= ?)
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(filter.since ?? null, filter.since ?? null, filter.limit) as MetricRow[]
  return rows.filter((row) => {
    if (filter.runId && row.runId !== filter.runId) return false
    if (filter.kind && row.kind !== filter.kind) return false
    return true
  })
}
