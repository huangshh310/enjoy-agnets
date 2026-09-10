/**
 * 本机 Agent CLI 工具箱合约：目录、探测、覆盖、doctor。
 * 不包含各家 login token。自定义 ACP 见 custom-agent.ts。
 */
import { z } from "zod"
import { CustomAgentToolId, isCustomAgentId } from "./custom-agent.ts"
import { RuntimeCapabilities } from "./runtime-capabilities.ts"

export const BuiltinAgentToolId = z.enum([
  "enjoy-local",
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "omp",
  "hermes",
  "amp",
  "deepseek"
])
export type BuiltinAgentToolId = z.infer<typeof BuiltinAgentToolId>

export const AgentToolId = z.union([BuiltinAgentToolId, CustomAgentToolId])
export type AgentToolId = z.infer<typeof AgentToolId>

export {
  CustomAgentToolId,
  CustomAgentCwdMode,
  CustomAgentEnv,
  CustomAgentRecord,
  UpsertCustomAgentInput,
  RemoveCustomAgentInput,
  isCustomAgentId,
  CUSTOM_AGENT_ID_RE
} from "./custom-agent.ts"

export const AgentToolTransport = z.enum(["local", "sdk-sandbox", "acp-host"])
export type AgentToolTransport = z.infer<typeof AgentToolTransport>

export const AgentToolDetectStatus = z.enum(["ready", "missing", "comingSoon", "skillOnly"])
export type AgentToolDetectStatus = z.infer<typeof AgentToolDetectStatus>

import {
  AgentCliModel,
  AgentCliProvider,
  AgentToolLoginProvider
} from "./agent-cli-provider.ts"
export {
  AgentCliModel,
  AgentCliProvider,
  AgentCliProviderOrigin,
  AgentCliLoginKind,
  AgentToolLoginProvider
} from "./agent-cli-provider.ts"
export const AgentToolAuthAccount = z.object({
  loggedIn: z.boolean(),
  email: z.string().optional(),
  tier: z.string().optional(),
  authMethod: z.string().optional(),
  accountName: z.string().optional(),
  organization: z.string().optional(),
  cliVersion: z.string().max(80).optional(),
  currentModel: z.string().max(160).optional(),
  rawStatus: z.string().max(400).optional()
})
export type AgentToolAuthAccount = z.infer<typeof AgentToolAuthAccount>
export const ModelQuotaItem = z.object({
  name: z.string(),
  displayName: z.string(),
  percentage: z.number(),
  resetsIn: z.string().nullable(),
  resetTime: z.string().nullable()
})
export type ModelQuotaItem = z.infer<typeof ModelQuotaItem>

export const AgentToolQuotaInfo = z.object({
  hasQuota: z.boolean(),
  usedPercent: z.number().optional(),
  resetsIn: z.string().optional(),
  windowType: z.string().optional(),
  details: z.string().optional(),
  modelQuotas: z.array(ModelQuotaItem).optional()
})
export type AgentToolQuotaInfo = z.infer<typeof AgentToolQuotaInfo>

/** npm/brew 可静默执行；copy 只给用户复制，不跑 curl|bash。 */
export const AgentToolInstallKind = z.enum(["npm", "brew", "copy"])
export type AgentToolInstallKind = z.infer<typeof AgentToolInstallKind>
export const AgentToolPublic = z.object({
  id: AgentToolId,
  label: z.string(),
  transport: AgentToolTransport,
  binaries: z.array(z.string()),
  acpArgs: z.array(z.string()),
  needsLoginHint: z.string(),
  available: z.boolean(),
  comingSoon: z.boolean(),
  skillOnly: z.boolean(),
  enabled: z.boolean(),
  binaryPath: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  detectedPath: z.string().nullable(),
  version: z.string().nullable(),
  status: AgentToolDetectStatus,
  models: z.array(AgentCliModel).default([]),
  providers: z.array(AgentCliProvider).optional(),
  selectedModel: z.string().optional(),
  installKind: AgentToolInstallKind.default("copy"),
  installCommand: z.string().default(""),
  docsUrl: z.string().default(""),
  providerId: z.string().optional(),
  useCustomProvider: z.boolean().default(false),
  /** 已绑定 Enjoy 档案的显示名；未绑则省略。 */
  boundProviderName: z.string().optional(),
  boundProviderKind: z.string().optional(),
  boundProviderApiStyle: z.string().optional(),
  /** 绑定档案是否已存 Key；renderer 只看布尔，不看明文。 */
  boundHasKey: z.boolean().optional(),
  supportedApiStyles: z.array(z.string()).default([]),
  authAccount: AgentToolAuthAccount.optional(),
  quotaInfo: AgentToolQuotaInfo.optional(),
  /** 静态保真清单投影；缺省时 renderer 用 capabilitiesFor(id)。 */
  capabilities: RuntimeCapabilities.optional(),
  /** builtin=目录项；custom=用户添加的 stdio ACP。缺省当 builtin。 */
  origin: z.enum(["builtin", "custom"]).optional(),
  cwdMode: z.enum(["workspace", "custom"]).optional(),
  customCwd: z.string().optional(),
  /** 只回显 env 键名，不把密钥值摊在列表里。 */
  envKeys: z.array(z.string()).optional(),
  /** 家目录已同步且未恢复；列表只画「已同步本机」轻标。 */
  homeSynced: z.boolean().optional()
})
export type AgentToolPublic = z.infer<typeof AgentToolPublic>

/** 目录安装 / 登录 / 同步只认内置 id。 */
export const AgentToolIdInput = z
  .object({
    id: BuiltinAgentToolId
  })
  .strict()
export type AgentToolIdInput = z.infer<typeof AgentToolIdInput>

/** 登录可带供应商（OMP：`omp auth-broker login <provider>`）。 */
export const LoginAgentToolInput = z
  .object({
    id: BuiltinAgentToolId,
    provider: AgentToolLoginProvider.optional()
  })
  .strict()
export type LoginAgentToolInput = z.infer<typeof LoginAgentToolInput>

export const AnyAgentToolIdInput = z
  .object({
    id: AgentToolId
  })
  .strict()
export type AnyAgentToolIdInput = z.infer<typeof AnyAgentToolIdInput>

export const UpsertAgentToolInput = z
  .object({
    id: AgentToolId,
    enabled: z.boolean().optional(),
    binaryPath: z.string().max(1024).optional(),
    extraArgs: z.array(z.string().max(200)).max(16).optional(),
    modelId: z.string().max(120).optional(),
    providerId: z.string().max(120).optional(),
    useCustomProvider: z.boolean().optional()
  })
  .strict()
export type UpsertAgentToolInput = z.infer<typeof UpsertAgentToolInput>

export const InstallAgentToolResult = z.object({
  id: AgentToolId,
  ok: z.boolean(),
  message: z.string(),
  command: z.string(),
  path: z.string().nullable()
})
export type InstallAgentToolResult = z.infer<typeof InstallAgentToolResult>
export const UninstallAgentToolResult = z.object({
  id: AgentToolId,
  ok: z.boolean(),
  message: z.string()
})
export type UninstallAgentToolResult = z.infer<typeof UninstallAgentToolResult>

export const InspectAgentToolInput = z
  .object({
    id: AgentToolId,
    refresh: z.boolean().optional()
  })
  .strict()
export type InspectAgentToolInput = z.infer<typeof InspectAgentToolInput>

/** 官方 CLI 公开状态，不含 token。 */
export const InspectAgentToolResult = z.object({
  id: AgentToolId,
  authAccount: AgentToolAuthAccount.optional(),
  quotaInfo: AgentToolQuotaInfo.optional(),
  models: z.array(AgentCliModel).default([]),
  providers: z.array(AgentCliProvider).optional()
})
export type InspectAgentToolResult = z.infer<typeof InspectAgentToolResult>


export const LoginAgentToolResult = z.object({
  id: AgentToolId,
  ok: z.boolean(),
  message: z.string()
})
export type LoginAgentToolResult = z.infer<typeof LoginAgentToolResult>

export const DoctorAgentToolInput = AnyAgentToolIdInput
export type DoctorAgentToolInput = z.infer<typeof DoctorAgentToolInput>

export const AgentToolDoctorResult = z.object({
  id: AgentToolId,
  ok: z.boolean(),
  message: z.string(),
  version: z.string().nullable(),
  path: z.string().nullable()
})
export type AgentToolDoctorResult = z.infer<typeof AgentToolDoctorResult>
export const SyncCliConfigResult = z.object({
  id: AgentToolId,
  ok: z.boolean(),
  message: z.string(),
  configPath: z.string().nullable()
})
export type SyncCliConfigResult = z.infer<typeof SyncCliConfigResult>


export const SetSessionRuntimeInput = z
  .object({
    sessionId: z.string().min(1),
    runtimeId: AgentToolId
  })
  .strict()
export type SetSessionRuntimeInput = z.infer<typeof SetSessionRuntimeInput>

export const DisposeSessionInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type DisposeSessionInput = z.infer<typeof DisposeSessionInput>

/** 有历史切引擎后写入；下一轮开流消费一次，不进用户气泡。 */
export const SetHandoffInput = z
  .object({
    sessionId: z.string().min(1),
    fromRuntimeId: AgentToolId,
    toRuntimeId: AgentToolId,
    summary: z.string().min(1).max(8000)
  })
  .strict()
export type SetHandoffInput = z.infer<typeof SetHandoffInput>

export const SessionHandoff = z.object({
  sessionId: z.string().min(1),
  fromRuntimeId: AgentToolId,
  toRuntimeId: AgentToolId,
  summary: z.string().min(1).max(8000)
})
export type SessionHandoff = z.infer<typeof SessionHandoff>

/** 可 spawn 的本机 ACP CLI。渲染进程用这个判断，不要 import agent-harness。 */
export const ACP_HOST_IDS = [
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

export function isAcpHostRuntimeId(id: string | undefined): boolean {
  if (isCustomAgentId(id)) return true
  return (ACP_HOST_IDS as readonly string[]).includes(id ?? "")
}
