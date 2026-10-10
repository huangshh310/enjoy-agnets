/**
 * 本地指标与导出。外部 OTEL 默认关闭。
 */
import { z } from "zod"
import { CostMissingItem, CostStatus } from "./estimated-cost.ts"

export const TelemetryMetric = z.object({
  id: z.string(),
  runId: z.string(),
  kind: z.string(),
  modelId: z.string().optional(),
  status: z.string(),
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
  cacheReadTokens: z.number().int().optional(),
  cacheWriteTokens: z.number().int().optional(),
  reasoningTokens: z.number().int().optional(),
  estimatedCostUsd: z.number().optional(),
  costStatus: CostStatus.optional().catch(undefined),
  /** 未知原因；旧行 / 非法枚举丢掉本字段，不丢整行。 */
  costMissing: z.array(CostMissingItem).optional().catch(undefined),
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
    format: z.enum(["json", "csv"]),
    /** 只导出该 epoch 毫秒之后的指标；缺省全量。 */
    since: z.number().int().optional()
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

/** 本机 CLI transcript 用量：空入参。聚合数字，不含 prompt / 路径。 */
export const ObservabilityCliUsageInput = z.object({}).strict()
export type ObservabilityCliUsageInput = z.infer<typeof ObservabilityCliUsageInput>

/** 与导轨 CLI 段同序；不含 enjoy-local / sandbox-harness / custom-acp。 */
export const CLI_USAGE_SOURCE_IDS = [
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "hermes",
  "amp",
  "deepseek",
  "omp"
] as const

export const CliUsageSourceId = z.enum(CLI_USAGE_SOURCE_IDS)
export type CliUsageSourceId = (typeof CLI_USAGE_SOURCE_IDS)[number]

export const CliUsageSourceStatus = z.enum([
  "has-usage",
  "directory-missing",
  "scanned-empty",
  "unsupported"
])
export type CliUsageSourceStatus = z.infer<typeof CliUsageSourceStatus>

/** 1 USD = 10^10 ticks。换算函数在 renderer。 */
export const GROK_USD_TICKS_PER_DOLLAR = 10_000_000_000

export const CliUsageSource = z.object({
  id: CliUsageSourceId,
  status: CliUsageSourceStatus,
  sessionCount: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUsdTicks: z.number().int().positive().optional()
})
export type CliUsageSource = z.infer<typeof CliUsageSource>

export const CliUsageBucket = z.object({
  key: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  breakdownSessions: z.number().int().nonnegative(),
  sourceIds: z.array(CliUsageSourceId)
})
export type CliUsageBucket = z.infer<typeof CliUsageBucket>

export const CliTranscriptUsage = z.object({
  scannedAt: z.number().int(),
  sources: z.array(CliUsageSource),
  days: z.array(CliUsageBucket),
  models: z.array(CliUsageBucket),
  projects: z.array(CliUsageBucket)
})
export type CliTranscriptUsage = z.infer<typeof CliTranscriptUsage>
