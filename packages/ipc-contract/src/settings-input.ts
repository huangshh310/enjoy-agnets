/**
 * 设置 / 供应商 / 偏好 IPC 合约。
 */
import { z } from "zod"
import { AgentMode } from "./chat"
import { PermissionMode as PermissionModeSchema } from "./permission-mode"
import { ReasoningEffort as ReasoningEffortSchema } from "./reasoning-effort"

export const PingProviderInput = z.object({
  id: z.string().optional(),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  apiStyle: z.string().optional()
})
export type PingProviderInput = z.infer<typeof PingProviderInput>

export const PingResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number(),
  message: z.string()
})
export type PingResultSchema = z.infer<typeof PingResultSchema>

export const SaveSecretInput = z.object({
  provider: z.string().min(1),
  apiKey: z.string().default(""),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  name: z.string().optional()
})
export type SaveSecretInput = z.infer<typeof SaveSecretInput>

export const ProviderModelItem = z.object({
  id: z.string(),
  label: z.string()
})
export type ProviderModelItem = z.infer<typeof ProviderModelItem>

export const UpsertProviderInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  apiStyle: z.string().optional(),
  fastModelId: z.string().optional(),
  reasoningModelId: z.string().optional(),
  contextWindow: z.number().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  reasoningEffort: ReasoningEffortSchema.optional(),
  customHeaders: z.string().optional(),
  customBody: z.string().optional(),
  models: z.array(ProviderModelItem).optional(),
  activate: z.boolean().optional()
})
export type UpsertProviderInput = z.infer<typeof UpsertProviderInput>

export const ProbeProviderInput = z.object({
  id: z.string().optional(),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  apiStyle: z.string().optional(),
  customHeaders: z.string().optional()
})
export type ProbeProviderInput = z.infer<typeof ProbeProviderInput>

export const ProviderPublic = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  baseURL: z.string(),
  modelId: z.string(),
  apiStyle: z.string().default("openai"),
  fastModelId: z.string().optional(),
  reasoningModelId: z.string().optional(),
  contextWindow: z.number().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  reasoningEffort: ReasoningEffortSchema.optional(),
  customHeaders: z.string().optional(),
  customBody: z.string().optional(),
  models: z.array(ProviderModelItem).optional(),
  hasKey: z.boolean(),
  keyHint: z.string(),
  active: z.boolean(),
  requiresKey: z.boolean()
})
export type ProviderPublic = z.infer<typeof ProviderPublic>

export const ModelOption = z.object({
  id: z.string(),
  label: z.string(),
  provider: z.string(),
  providerId: z.string().optional(),
  providerName: z.string().optional(),
  apiStyle: z.string().optional(),
  active: z.boolean().optional(),
  isFast: z.boolean().optional(),
  isReasoning: z.boolean().optional(),
  supportsReasoning: z.boolean().optional(),
  reasoningEffort: ReasoningEffortSchema.optional(),
  capabilities: z.array(z.string()).optional(),
  staticCaps: z.array(z.string()).optional(),
  probedCaps: z.array(z.string()).optional(),
  probedAt: z.number().int().optional()
})
export type ModelOption = z.infer<typeof ModelOption>

export const SettingsSnapshot = z.object({
  hasKey: z.boolean(),
  provider: z.string().nullable(),
  baseURL: z.string().nullable(),
  defaultModelId: z.string(),
  lastWorkspaceId: z.string().nullable(),
  providers: z.array(ProviderPublic).default([]),
  preferences: z.object({
    requireWriteApproval: z.boolean(),
    requireBashApproval: z.boolean(),
    requireCommitApproval: z.boolean().default(true),
    permissionMode: PermissionModeSchema.default("allow-reads"),
    codingRuntime: z.enum(["local", "harness"]).default("local"),
    harnessId: z.string().optional(),
    language: z.enum(["auto", "en", "zh"]),
    defaultMode: AgentMode,
    customInstructions: z.string(),
    telemetryPolicy: z.enum(["local", "otel", "off"]).default("local"),
    otelEndpoint: z.string().optional(),
    knowledgeAutoIndex: z.boolean().default(false),
    workflowAutoResume: z.boolean().default(true),
    sandboxNetwork: z.boolean().default(false),
    experimentalMedia: z.boolean().default(false),
    maxAgentSteps: z.number().int().min(1).max(64).default(20),
    agentTimeoutMs: z.number().int().min(0).max(600_000).default(0),
    toolTimeoutMs: z.number().int().min(1_000).max(300_000).default(30_000),
    stepTimeoutMs: z.number().int().min(0).max(600_000).default(0)
  }),
  harness: z
    .object({
      adapterId: z.string().nullable(),
      adapterLabel: z.string(),
      available: z.boolean(),
      comingSoon: z.boolean(),
      needsSandbox: z.boolean(),
      usesProviderKey: z.boolean(),
      hasProviderKey: z.boolean(),
      hasSandboxToken: z.boolean(),
      ready: z.boolean(),
      blockedReason: z.string().nullable(),
      hasAnthropicKey: z.boolean(),
      hasVercelToken: z.boolean(),
      catalog: z
        .array(z.object({ id: z.string(), label: z.string(), comingSoon: z.boolean() }))
        .default([])
    })
    .default({
      adapterId: null,
      adapterLabel: "None",
      available: false,
      comingSoon: false,
      needsSandbox: false,
      usesProviderKey: false,
      hasProviderKey: false,
      hasSandboxToken: false,
      ready: false,
      blockedReason: null,
      hasAnthropicKey: false,
      hasVercelToken: false,
      catalog: []
    })
})
export type SettingsSnapshot = z.infer<typeof SettingsSnapshot>

export const SetPreferencesInput = z.object({
  requireWriteApproval: z.boolean().optional(),
  requireBashApproval: z.boolean().optional(),
  requireCommitApproval: z.boolean().optional(),
  permissionMode: PermissionModeSchema.optional(),
  codingRuntime: z.enum(["local", "harness"]).optional(),
  harnessId: z.string().optional(),
  language: z.enum(["auto", "en", "zh"]).optional(),
  defaultMode: AgentMode.optional(),
  customInstructions: z.string().optional(),
  telemetryPolicy: z.enum(["local", "otel", "off"]).optional(),
  otelEndpoint: z.string().optional(),
  knowledgeAutoIndex: z.boolean().optional(),
  workflowAutoResume: z.boolean().optional(),
  sandboxNetwork: z.boolean().optional(),
  experimentalMedia: z.boolean().optional(),
  maxAgentSteps: z.number().int().min(1).max(64).optional(),
  agentTimeoutMs: z.number().int().min(0).max(600_000).optional(),
  toolTimeoutMs: z.number().int().min(1_000).max(300_000).optional(),
  stepTimeoutMs: z.number().int().min(0).max(600_000).optional()
})
export type SetPreferencesInput = z.infer<typeof SetPreferencesInput>

export const SetActiveModelInput = z
  .object({
    providerId: z.string().optional(),
    modelId: z.string().min(1)
  })
  .strict()
export type SetActiveModelInput = z.infer<typeof SetActiveModelInput>

export const SetHarnessInput = z.object({
  anthropicApiKey: z.string().optional(),
  vercelToken: z.string().optional(),
  vercelTeamId: z.string().optional(),
  vercelProjectId: z.string().optional()
})
export type SetHarnessInput = z.infer<typeof SetHarnessInput>
