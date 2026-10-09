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
  cacheReadTokens?: number | null
  cacheWriteTokens?: number | null
  reasoningTokens?: number | null
  estimatedCostUsd?: number | null
  costStatus?: string | null
  costMissing?: string[] | null
  durationMs: number | null
  ttfoMs: number | null
  tokensPerSecond: number | null
  errorClass: string | null
  createdAt: number
}

export function insertMetric(db: AppDatabase, row: MetricRow): void {
  db.prepare(
    `INSERT INTO telemetry_metrics
      (id, run_id, kind, model_id, status, input_tokens, output_tokens,
       cache_read_tokens, cache_write_tokens, reasoning_tokens,
       estimated_cost_usd, cost_status, cost_missing,
       duration_ms, ttfo_ms, tokens_per_second, error_class, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.runId,
    row.kind,
    row.modelId,
    row.status,
    row.inputTokens,
    row.outputTokens,
    row.cacheReadTokens ?? null,
    row.cacheWriteTokens ?? null,
    row.reasoningTokens ?? null,
    row.estimatedCostUsd ?? null,
    row.costStatus ?? null,
    encodeMissing(row.costMissing),
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
              cache_read_tokens as cacheReadTokens, cache_write_tokens as cacheWriteTokens,
              reasoning_tokens as reasoningTokens, estimated_cost_usd as estimatedCostUsd,
              cost_status as costStatus, cost_missing as costMissing,
              duration_ms as durationMs, ttfo_ms as ttfoMs,
              tokens_per_second as tokensPerSecond, error_class as errorClass,
              created_at as createdAt
       FROM telemetry_metrics
       WHERE (? IS NULL OR created_at >= ?)
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(filter.since ?? null, filter.since ?? null, filter.limit) as Array<
      Omit<MetricRow, "costMissing"> & { costMissing: string | null }
    >
  return rows.map((row) => ({ ...row, costMissing: decodeMissing(row.costMissing) })).filter((row) => {
    if (filter.runId && row.runId !== filter.runId) return false
    if (filter.kind && row.kind !== filter.kind) return false
    return true
  })
}

function encodeMissing(items: string[] | null | undefined): string | null {
  if (!items?.length) return null
  return JSON.stringify(items)
}

function decodeMissing(raw: string | null | undefined): string[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const items = parsed.filter((item): item is string => typeof item === "string")
    return items.length > 0 ? items : null
  } catch {
    return null
  }
}
