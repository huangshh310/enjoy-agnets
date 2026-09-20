/**
 * 本机 CLI / Enjoy Local 的运行时能力合约。
 * renderer 与 harness 只读这份表；未声明 = 隐藏或禁用，禁止伪造控件。
 */
import { z } from "zod"
import { isCustomAgentId } from "./custom-agent.ts"
import { HIDDEN_RUNTIME_CAPABILITIES, RUNTIME_CAPABILITIES } from "./runtime-capabilities-table.ts"

export const RuntimeCapabilities = z.object({
  spawn: z.boolean(),
  models: z.enum(["none", "catalog", "inspect"]),
  login: z.boolean(),
  quota: z.boolean(),
  thinking: z.enum(["none", "model-id", "acp-mode", "effort"]),
  fast: z.enum(["none", "model-id", "flag", "local"]),
  permissionUi: z.enum(["enjoy-hmac", "hidden"]),
  executionModes: z.enum(["enjoy-local", "hidden"]),
  slash: z.enum(["enjoy-local", "hidden", "acp-list"]),
  resumeFork: z.boolean(),
  compact: z.enum(["enjoy-local", "cli", "hidden"]),
  askUser: z.enum(["enjoy-hmac", "hidden"]),
  steer: z.boolean(),
  realtime: z.boolean(),
  delegate: z.boolean(),
  providerBind: z.enum(["none", "anthropic", "openai", "deepseek", "google", "opencode"]),
  /** 宿主 MCP：Local 注入工具 / ACP session/new 透传 / 不传。 */
  hostMcp: z.enum(["local-tools", "acp-passthrough", "none"]),
  /** 宿主 Skills：Local skill 工具 / ACP prompt 索引 / 不灌。 */
  hostSkills: z.enum(["catalog-tool", "catalog-prompt", "none"]),
  mcpHttp: z.boolean(),
  mcpSse: z.boolean()
})
export type RuntimeCapabilities = z.infer<typeof RuntimeCapabilities>

export type RuntimePathKind = "enjoy-local" | "acp-host" | "sandbox-harness"

export const SANDBOX_HARNESS_ID = "sandbox-harness"

export type ComposerChrome = {
  attach: boolean
  permission: boolean
  agentPicker: boolean
  send: boolean
  executionModes: boolean
  fast: boolean
  thinking: boolean
  voice: boolean
  pathKind: RuntimePathKind
  showOnEngineRail: boolean
  quota: boolean
}

export { HIDDEN_RUNTIME_CAPABILITIES, RUNTIME_CAPABILITIES }

/** 按 runtimeId 取静态能力；未知 id 回落隐藏表。自定义 ACP 走保守表。 */
export function capabilitiesFor(id: string | undefined): RuntimeCapabilities {
  if (!id) return HIDDEN_RUNTIME_CAPABILITIES
  if (isCustomAgentId(id)) return RUNTIME_CAPABILITIES["custom-acp"] ?? HIDDEN_RUNTIME_CAPABILITIES
  return RUNTIME_CAPABILITIES[id] ?? HIDDEN_RUNTIME_CAPABILITIES
}

/** list IPC 投影优先，否则回落静态表。 */
export function capabilitiesOf(tool: { id: string; capabilities?: RuntimeCapabilities }): RuntimeCapabilities {
  return tool.capabilities ?? capabilitiesFor(tool.id)
}

/** 三路路径：Enjoy 本地 / ACP 本机 CLI / 进阶沙箱。未知 id 不当沙箱，避免误上导轨。 */
export function runtimePathKind(runtimeId: string | undefined): RuntimePathKind {
  if (runtimeId === "enjoy-local") return "enjoy-local"
  if (runtimeId === SANDBOX_HARNESS_ID) return "sandbox-harness"
  return "acp-host"
}

/**
 * Composer 底栏显隐。C 端探索/执行分段不再跟 executionModes 整颗藏掉。
 * Fast 仅 local|flag；五档思考仅 effort。model-id 走「思考 · 跟模型」。
 * 进阶沙箱不得出现在引擎导轨。
 */
export function composerChromeFor(runtimeId: string | undefined): ComposerChrome {
  const cap = capabilitiesFor(runtimeId)
  const pathKind = runtimePathKind(runtimeId)
  return {
    attach: true,
    permission: cap.permissionUi === "enjoy-hmac",
    agentPicker: true,
    send: true,
    executionModes: cap.executionModes === "enjoy-local",
    fast: cap.fast === "local" || cap.fast === "flag",
    thinking: cap.thinking === "effort",
    voice: cap.realtime,
    pathKind,
    showOnEngineRail: pathKind !== "sandbox-harness" && Boolean(runtimeId) && cap.spawn,
    quota: cap.quota
  }
}

/** HMAC 审批才能在探索态拦写/命令。否则 C2：分段仍在，探索禁用 + 原因。 */
export function canHostInterceptExplore(runtimeId: string | undefined): boolean {
  return capabilitiesFor(runtimeId).permissionUi === "enjoy-hmac"
}

export type ComposerThinkingChrome = "effort" | "follow-model" | "none"

/** 思考铬：effort 五档；model-id / acp-mode 跟模型；none 隐藏。 */
export function composerThinkingChrome(runtimeId: string | undefined): ComposerThinkingChrome {
  const thinking = capabilitiesFor(runtimeId).thinking
  if (thinking === "effort") return "effort"
  if (thinking === "model-id" || thinking === "acp-mode") return "follow-model"
  return "none"
}

/** L3 / 检查器：宿主把 MCP schema 计进当前引擎。 */
export function countsHostMcpTokens(runtimeId: string | undefined): boolean {
  const mode = capabilitiesFor(runtimeId).hostMcp
  return mode === "local-tools" || mode === "acp-passthrough"
}

/** L3 / 检查器：宿主把技能索引计进当前引擎。 */
export function countsHostSkillTokens(runtimeId: string | undefined): boolean {
  const mode = capabilitiesFor(runtimeId).hostSkills
  return mode === "catalog-tool" || mode === "catalog-prompt"
}

/**
 * 对话回滚：Enjoy Local 的 SQLite 历史是真源，可截断后重开。
 * ACP CLI 自己攒上下文，截断 UI 不会 rewind，必须先拒。
 */
export function supportsConversationRollback(runtimeId: string | undefined): boolean {
  return runtimePathKind(runtimeId) === "enjoy-local"
}

/** 设置能力矩阵行序：Enjoy 本地 → ACP → 进阶沙箱（末行，不上导轨）。 */
export const MATRIX_RUNTIME_IDS = [
  "enjoy-local",
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
  "omp",
  SANDBOX_HARNESS_ID
] as const
