/**
 * 本地指标：模型、步骤、token、耗时。OTEL 默认关闭。
 */
import { insertMetric, listMetrics } from "@enjoy-agents/db"
import { redactMetric } from "@enjoy-agents/agent-core"
import { getDatabase, getSetting, setSetting } from "./database"
import { createId } from "./ids"
import { maybeExportOtel } from "./otel-export"

export function telemetryPolicy(): "local" | "otel" | "off" {
  const value = getSetting("telemetryPolicy")
  if (value === "otel" || value === "off" || value === "local") return value
  return "local"
}

export function setTelemetryPolicy(policy: "local" | "otel" | "off", otelEndpoint?: string): void {
  setSetting("telemetryPolicy", policy)
  if (otelEndpoint) setSetting("otelEndpoint", otelEndpoint)
}

export function recordMetric(input: {
  runId: string
  kind: string
  modelId?: string
  status: string
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  estimatedCostUsd?: number
  costStatus?: string
  durationMs?: number
  ttfoMs?: number
  tokensPerSecond?: number
  errorClass?: string
}): void {
  if (telemetryPolicy() === "off") return
  const safe = redactMetric(input)
  insertMetric(getDatabase(), {
    id: createId("met"),
    runId: String(safe.runId ?? input.runId),
    kind: String(safe.kind ?? input.kind),
    modelId: input.modelId ?? null,
    status: input.status,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    cacheReadTokens: input.cacheReadTokens ?? null,
    cacheWriteTokens: input.cacheWriteTokens ?? null,
    reasoningTokens: input.reasoningTokens ?? null,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
    costStatus: input.costStatus ?? null,
    durationMs: input.durationMs ?? null,
    ttfoMs: input.ttfoMs ?? null,
    tokensPerSecond: input.tokensPerSecond ?? null,
    errorClass: input.errorClass ?? null,
    createdAt: Date.now()
  })
  if (telemetryPolicy() === "otel") {
    void maybeExportOtel(input)
  }
}

export function queryMetrics(filter: { runId?: string; kind?: string; limit: number }) {
  return listMetrics(getDatabase(), filter)
}

export function exportMetrics(format: "json" | "csv", since?: number): string {
  const rows = listMetrics(getDatabase(), { since, limit: 50_000 })
  if (format === "json") return JSON.stringify(rows, null, 2)
  const header =
    "id,runId,kind,modelId,status,inputTokens,outputTokens,durationMs,ttfoMs,tokensPerSecond,errorClass,createdAt"
  const lines = rows.map((row) =>
    [
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
    ].join(",")
  )
  return [header, ...lines].join("\n")
}
