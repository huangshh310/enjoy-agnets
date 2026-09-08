/**
 * 本机 CLI / Enjoy Local 的运行时能力合约。
 * renderer 与 harness 只读这份表；未声明 = 隐藏或禁用，禁止伪造控件。
 */
import { z } from "zod"
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
  providerBind: z.enum(["none", "anthropic", "openai", "deepseek"])
})
export type RuntimeCapabilities = z.infer<typeof RuntimeCapabilities>

export type ComposerChrome = {
  attach: boolean
  permission: boolean
  agentPicker: boolean
  send: boolean
  executionModes: boolean
  fast: boolean
  thinking: boolean
  voice: boolean
}

export { HIDDEN_RUNTIME_CAPABILITIES, RUNTIME_CAPABILITIES }

/** 按 runtimeId 取静态能力；未知 id 回落隐藏表。 */
export function capabilitiesFor(id: string | undefined): RuntimeCapabilities {
  if (!id) return HIDDEN_RUNTIME_CAPABILITIES
  return RUNTIME_CAPABILITIES[id] ?? HIDDEN_RUNTIME_CAPABILITIES
}

/** list IPC 投影优先，否则回落静态表。 */
export function capabilitiesOf(tool: { id: string; capabilities?: RuntimeCapabilities }): RuntimeCapabilities {
  return tool.capabilities ?? capabilitiesFor(tool.id)
}

/**
 * Composer 底栏显隐。ACP 只留 + / 审批 / 引擎胶囊 / 发送。
 * Fast 仅 local|flag 显示；thinking 仅 effort 显示五档条。
 */
export function composerChromeFor(runtimeId: string | undefined): ComposerChrome {
  const cap = capabilitiesFor(runtimeId)
  return {
    attach: true,
    permission: cap.permissionUi === "enjoy-hmac",
    agentPicker: true,
    send: true,
    executionModes: cap.executionModes === "enjoy-local",
    fast: cap.fast === "local" || cap.fast === "flag",
    thinking: cap.thinking === "effort",
    voice: cap.realtime
  }
}
