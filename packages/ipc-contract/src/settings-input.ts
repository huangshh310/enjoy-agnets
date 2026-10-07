/**
 * 设置 / 供应商 / 偏好 IPC 合约。
 */
import { z } from "zod"
import { AccountProfilePref } from "./account-profile"
import { DesktopAlwaysAllowAppKeys } from "./desktop-always-allow"
import { AgentToolPublic } from "./agent-tools"
import { AgentMode } from "./chat"
import { PermissionMode as PermissionModeSchema } from "./permission-mode"
import {
  ProviderEndpointsInput,
  ProviderKeyPublic,
  ProviderModelItem,
  ReasoningFamilyInput,
  WireApiStyle
} from "./provider-profile"
import { KeybindingRuleList } from "./keybindings"
import { ReasoningEffort as ReasoningEffortSchema } from "./reasoning-effort"

export {
  CatalogModelSource,
  DetectProviderInput,
  DetectProviderProbe,
  DuplicateProviderInput,
  ProviderEndpointsInput,
  ProviderKeyInput,
  ProviderKeyPublic,
  ProviderModelItem,
  ReasoningFamilyInput,
  SetProviderEnabledInput,
  UpsertProviderInput,
  WireApiStyle
} from "./provider-profile"

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
  requiresKey: z.boolean(),
  enabled: z.boolean().default(true),
  endpoints: ProviderEndpointsInput.default({}),
  baseAPI: WireApiStyle.default("openai"),
  regionId: z.string().optional(),
  keys: z.array(ProviderKeyPublic).default([]),
  modelsURL: z.string().optional(),
  reasoningFamily: ReasoningFamilyInput.default("auto"),
  proxy: z.string().optional()
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
  probedAt: z.number().int().optional(),
  contextWindow: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  wireStyles: z.array(WireApiStyle).optional()
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
    runtimeId: z.string().optional(),
    language: z.enum(["auto", "en", "zh"]).default("zh"),
    defaultMode: AgentMode,
    customInstructions: z.string(),
    telemetryPolicy: z.enum(["local", "otel", "off"]).default("local"),
    otelEndpoint: z.string().optional(),
    knowledgeAutoIndex: z.boolean().default(false),
    workflowAutoResume: z.boolean().default(true),
    sandboxNetwork: z.boolean().default(false),
    experimentalMedia: z.boolean().default(false),
    defaultImageModelId: z.string().optional(),
    defaultVideoModelId: z.string().optional(),
    defaultSpeechModelId: z.string().optional(),
    defaultTranscriptionModelId: z.string().optional(),
    maxAgentSteps: z.number().int().min(1).max(64).default(20),
    agentTimeoutMs: z.number().int().min(0).max(600_000).default(0),
    toolTimeoutMs: z.number().int().min(1_000).max(300_000).default(30_000),
    stepTimeoutMs: z.number().int().min(0).max(600_000).default(0),
    desktopPush: z.boolean().default(true),
    agentCompleteSound: z.boolean().default(true),
    approvalRequiredAlert: z.boolean().default(true),
    /** Composer 与设置行额度数字：已用或剩余。条宽仍是已用百分比。 */
    usageNumber: z.enum(["used", "remaining"]).default("used"),
    accountProfile: AccountProfilePref.optional(),
    /** 引擎级可选显示名，按 runtimeId。空/缺键回退品牌名，不进云身份。 */
    agentDisplayNames: z.record(z.string().min(1), z.string().max(40)).default({}),
    /** 启动引导完成时间。空表示还没走完；已有工作区的旧安装会补上，避免再弹出。 */
    setupGuideCompletedAt: z.string().nullable().optional(),
    /**
     * CU-P1-A 本机持久簿。settings.get 可读；禁止经 setPreferences 改写。
     * 条目是 { appKey, displayName }，kai 闸只认 appKey。
     */
    desktopAlwaysAllowAppKeys: DesktopAlwaysAllowAppKeys,
    /** 用户快捷键规则。空数组表示全部走默认。删光写成 unassigned，避免下次启动回到默认。 */
    keybindings: KeybindingRuleList.default([]),
    /** 蓝边指针色。只影响 overlay，不注入系统光标。 */
    computerUsePointer: z.enum(["stock", "custom"]).default("stock"),
    /** 关掉预览只隐藏画面，不停当前 run。 */
    computerUsePreview: z.boolean().default(true),
    computerUsePreviewSize: z.enum(["compact", "large"]).default("compact"),
    /** AppSnap 总开关。非 macOS 即使为 true 也不注册全局热键。 */
    appsnapEnabled: z.boolean().default(false),
    /** 正好两键，其中一键是修饰键。默认左 Option + 右 Option。 */
    appsnapChord: z.string().min(1).max(64).default("alt.left+alt.right"),
    appsnapSound: z.boolean().default(true)
  }),
  /** 读盘时丢掉的快捷键规则名。不写回 preferences。 */
  keybindingIssues: z.array(z.string()).default([]),
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
    }),
  agentTools: z.array(AgentToolPublic).default([]),
  sessionRuntimes: z.record(z.string(), z.string()).default({}),
  sessionModels: z.record(z.string(), z.string()).default({})
})
export type SettingsSnapshot = z.infer<typeof SettingsSnapshot>

export const SetPreferencesInput = z.object({
  requireWriteApproval: z.boolean().optional(),
  requireBashApproval: z.boolean().optional(),
  requireCommitApproval: z.boolean().optional(),
  permissionMode: PermissionModeSchema.optional(),
  codingRuntime: z.enum(["local", "harness"]).optional(),
  harnessId: z.string().optional(),
  runtimeId: z.string().optional(),
  language: z.enum(["auto", "en", "zh"]).optional(),
  defaultMode: AgentMode.optional(),
  customInstructions: z.string().optional(),
  telemetryPolicy: z.enum(["local", "otel", "off"]).optional(),
  otelEndpoint: z.string().optional(),
  knowledgeAutoIndex: z.boolean().optional(),
  workflowAutoResume: z.boolean().optional(),
  sandboxNetwork: z.boolean().optional(),
  experimentalMedia: z.boolean().optional(),
  defaultImageModelId: z.string().optional(),
  defaultVideoModelId: z.string().optional(),
  defaultSpeechModelId: z.string().optional(),
  defaultTranscriptionModelId: z.string().optional(),
  maxAgentSteps: z.number().int().min(1).max(64).optional(),
  agentTimeoutMs: z.number().int().min(0).max(600_000).optional(),
  toolTimeoutMs: z.number().int().min(1_000).max(300_000).optional(),
  stepTimeoutMs: z.number().int().min(0).max(600_000).optional(),
  desktopPush: z.boolean().optional(),
  agentCompleteSound: z.boolean().optional(),
  approvalRequiredAlert: z.boolean().optional(),
  usageNumber: z.enum(["used", "remaining"]).optional(),
  accountProfile: AccountProfilePref.optional(),
  agentDisplayNames: z.record(z.string().min(1), z.string().max(40)).optional(),
  setupGuideCompletedAt: z.string().nullable().optional(),
  keybindings: KeybindingRuleList.optional(),
  computerUsePointer: z.enum(["stock", "custom"]).optional(),
  computerUsePreview: z.boolean().optional(),
  computerUsePreviewSize: z.enum(["compact", "large"]).optional(),
  appsnapEnabled: z.boolean().optional(),
  appsnapChord: z.string().min(1).max(64).optional(),
  appsnapSound: z.boolean().optional()
})
export type SetPreferencesInput = z.infer<typeof SetPreferencesInput>

export const SetActiveModelInput = z
  .object({
    providerId: z.string().optional(),
    modelId: z.string().min(1)
  })
  .strict()
export type SetActiveModelInput = z.infer<typeof SetActiveModelInput>

export const SetDefaultModelInput = z
  .object({
    modelId: z.string().min(1)
  })
  .strict()
export type SetDefaultModelInput = z.infer<typeof SetDefaultModelInput>

export const ProviderIdInput = z
  .object({
    id: z.string().min(1)
  })
  .strict()
export type ProviderIdInput = z.infer<typeof ProviderIdInput>

export const SetHarnessInput = z.object({
  anthropicApiKey: z.string().optional(),
  vercelToken: z.string().optional(),
  vercelTeamId: z.string().optional(),
  vercelProjectId: z.string().optional()
})
export type SetHarnessInput = z.infer<typeof SetHarnessInput>
