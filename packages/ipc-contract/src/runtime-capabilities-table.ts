/**
 * 各 runtime 的静态保真清单。未出现在表里的 id 走保守默认（不 spawn、不露控件）。
 * UI 只信这份表，不信 ACP initialize.agentCapabilities。
 */
import type { RuntimeCapabilities } from "./runtime-capabilities.ts"

/** 未知 id：未声明 = 不做。 */
export const HIDDEN_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  spawn: false,
  models: "none",
  login: false,
  quota: false,
  thinking: "none",
  fast: "none",
  permissionUi: "hidden",
  executionModes: "hidden",
  slash: "hidden",
  resumeFork: false,
  compact: "hidden",
  askUser: "hidden",
  steer: false,
  realtime: false,
  delegate: false,
  providerBind: "none",
  hostMcp: "none",
  hostSkills: "none",
  mcpHttp: false,
  mcpSse: false
}

/** 已接线 ACP 宿主的公共底：HMAC 审批、纠偏当下一轮 prompt、无斜杠/委派。 */
function acpHost(
  rest: Pick<
    RuntimeCapabilities,
    "models" | "login" | "quota" | "thinking" | "fast" | "providerBind"
  > &
    Partial<Pick<RuntimeCapabilities, "hostMcp" | "hostSkills" | "mcpHttp" | "mcpSse">>
): RuntimeCapabilities {
  return {
    spawn: true,
    permissionUi: "enjoy-hmac",
    executionModes: "hidden",
    slash: "hidden",
    resumeFork: false,
    compact: "cli",
    askUser: "hidden",
    steer: true,
    realtime: false,
    delegate: false,
    hostMcp: "acp-passthrough",
    hostSkills: "catalog-prompt",
    mcpHttp: true,
    mcpSse: false,
    ...rest
  }
}

export const RUNTIME_CAPABILITIES: Record<string, RuntimeCapabilities> = {
  "enjoy-local": {
    spawn: true,
    models: "catalog",
    login: false,
    quota: false,
    thinking: "effort",
    fast: "local",
    permissionUi: "enjoy-hmac",
    executionModes: "enjoy-local",
    slash: "enjoy-local",
    resumeFork: false,
    compact: "enjoy-local",
    askUser: "enjoy-hmac",
    steer: true,
    realtime: true,
    delegate: true,
    providerBind: "none",
    hostMcp: "local-tools",
    hostSkills: "catalog-tool",
    mcpHttp: false,
    mcpSse: false
  },
  claude: acpHost({
    models: "inspect",
    login: true,
    quota: true,
    thinking: "model-id",
    fast: "none",
    providerBind: "anthropic"
  }),
  cursor: acpHost({
    models: "catalog",
    login: true,
    quota: true,
    thinking: "model-id",
    fast: "model-id",
    providerBind: "none"
  }),
  grok: acpHost({
    models: "catalog",
    login: true,
    quota: true,
    thinking: "none",
    fast: "none",
    providerBind: "none"
  }),
  codex: acpHost({
    models: "inspect",
    login: true,
    quota: true,
    thinking: "none",
    fast: "none",
    providerBind: "openai"
  }),
  antigravity: acpHost({
    models: "catalog",
    login: true,
    quota: true,
    thinking: "model-id",
    fast: "none",
    providerBind: "none"
  }),
  gemini: acpHost({
    models: "catalog",
    login: true,
    quota: false,
    thinking: "model-id",
    fast: "none",
    providerBind: "google"
  }),
  opencode: acpHost({
    models: "inspect",
    login: true,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "opencode"
  }),
  pi: acpHost({
    models: "inspect",
    login: true,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "none",
    hostMcp: "none"
  }),
  hermes: acpHost({
    models: "none",
    login: true,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "none"
  }),
  amp: acpHost({
    models: "none",
    login: true,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "none"
  }),
  deepseek: acpHost({
    models: "catalog",
    login: false,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "deepseek"
  }),
  omp: acpHost({
    models: "inspect",
    login: true,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "none"
  }),
  /** 用户添加的 stdio ACP：可 spawn + HMAC，无额度 / 登录 / Fast。 */
  "custom-acp": acpHost({
    models: "none",
    login: false,
    quota: false,
    thinking: "none",
    fast: "none",
    providerBind: "none"
  }),
  /** 设置-only；Composer 导轨用 composerChromeFor.showOnEngineRail 挡住。 */
  "sandbox-harness": {
    spawn: true,
    models: "catalog",
    login: false,
    quota: false,
    thinking: "effort",
    fast: "local",
    permissionUi: "enjoy-hmac",
    executionModes: "enjoy-local",
    slash: "hidden",
    resumeFork: false,
    compact: "hidden",
    askUser: "enjoy-hmac",
    steer: true,
    realtime: false,
    delegate: false,
    providerBind: "none",
    hostMcp: "none",
    hostSkills: "none",
    mcpHttp: false,
    mcpSse: false
  }
}
