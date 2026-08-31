/**
 * 本地指标与导出。外部 OTEL 默认关闭。
 */
import { z } from "zod"

export const TelemetryMetric = z.object({
  id: z.string(),
  runId: z.string(),
  kind: z.string(),
  modelId: z.string().optional(),
  status: z.string(),
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
  durationMs: z.number().int().optional(),
  ttfoMs: z.number().int().optional(),
  tokensPerSecond: z.number().optional(),
  errorClass: z.string().optional(),
  createdAt: z.number().int()
})
export type TelemetryMetric = z.infer<typeof TelemetryMetric>

export const ObservabilityMetricsInput = z
  .object({
    runId: z.string().optional(),
    kind: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100)
  })
  .strict()
export type ObservabilityMetricsInput = z.infer<typeof ObservabilityMetricsInput>

export const ObservabilityExportInput = z
  .object({
    format: z.enum(["json", "csv"])
  })
  .strict()
export type ObservabilityExportInput = z.infer<typeof ObservabilityExportInput>

export const ObservabilitySetPolicyInput = z
  .object({
    policy: z.enum(["local", "otel", "off"]),
    otelEndpoint: z.string().optional()
  })
  .strict()
export type ObservabilitySetPolicyInput = z.infer<typeof ObservabilitySetPolicyInput>

export const ObservabilityReplayInput = z
  .object({
    sessionId: z.string().optional(),
    runId: z.string().optional(),
    limit: z.number().int().min(1).max(400).default(200)
  })
  .strict()
export type ObservabilityReplayInput = z.infer<typeof ObservabilityReplayInput>
