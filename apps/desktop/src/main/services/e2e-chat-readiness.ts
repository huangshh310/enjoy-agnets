/**
 * 仅 ENJOY_E2E_STUB=1 且未打包：向导 / 空态夹具。
 * key / key-no-model / engine 的真 vault 与已登录 stub 在 seed 里。
 */
import type { AgentToolId, AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { buildChatReadiness, type ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

export const E2E_CHAT_READY_KEY_PROFILE_ID = "e2e"
export const E2E_CHAT_READY_MODEL_ID = "stub-e2e"
export const E2E_CHAT_READY_ENGINE_ID = "claude"
export const E2E_CHAT_READY_ENGINE_NAME = "Claude Code"

export const E2E_CHAT_READY_KINDS = ["key", "engine", "none", "unverified", "key-no-model"] as const
export type E2eChatReadyKind = (typeof E2E_CHAT_READY_KINDS)[number]

export function e2eChatReadyKind(env: NodeJS.ProcessEnv = process.env): E2eChatReadyKind | undefined {
  const kind = env.ENJOY_E2E_CHAT_READY
  return E2E_CHAT_READY_KINDS.find((item) => item === kind)
}

/** 不要再种无密钥 Ollama，否则会盖掉「有密钥没模型」。 */
export function e2eChatReadySkipsBootstrapProfile(kind?: E2eChatReadyKind): boolean {
  return kind === "none" || kind === "key-no-model"
}

/** 不要写 defaultModelId，否则 Composer 会自动顶上模型。 */
export function e2eChatReadySkipsDefaultModel(kind?: E2eChatReadyKind): boolean {
  return kind === "key-no-model"
}

export function e2eChatReadinessAllowed(env: NodeJS.ProcessEnv = process.env, packaged = false): boolean {
  return env.ENJOY_E2E_STUB === "1" && !packaged
}

/** 写盘夹具还要隔离 userData，避免误种到本机目录。 */
export function e2eChatReadySeedAllowed(input: {
  env?: NodeJS.ProcessEnv
  packaged?: boolean
  userData?: string
}): boolean {
  const env = input.env ?? process.env
  if (!e2eChatReadinessAllowed(env, input.packaged === true)) return false
  const isolated = env.ENJOY_E2E_USERDATA || env.ENJOY_DEV_USERDATA
  if (!isolated) return false
  if (input.userData && input.userData !== isolated) return false
  return true
}

export function e2eChatReadiness(
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): ChatReadiness | null {
  if (!e2eChatReadinessAllowed(env, packaged)) return null
  const kind = e2eChatReadyKind(env)
  if (kind === "key" || kind === "key-no-model") {
    return buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: E2E_CHAT_READY_KEY_PROFILE_ID, presetId: "openai" }],
      engineCount: 1,
      preferredRuntimeId: "enjoy-local",
      ...(kind === "key" ? { modelId: E2E_CHAT_READY_MODEL_ID } : {}),
      hasEnjoySecret: true
    })
  }
  if (kind === "engine") {
    return buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: E2E_CHAT_READY_ENGINE_ID, name: E2E_CHAT_READY_ENGINE_NAME }],
      localModels: [],
      apiKeys: [],
      engineCount: 1,
      preferredRuntimeId: E2E_CHAT_READY_ENGINE_ID,
      hasEnjoySecret: false
    })
  }
  if (kind === "none") {
    return buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [],
      engineCount: 1,
      hasEnjoySecret: false
    })
  }
  if (kind === "unverified") {
    return buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: false }],
      apiKeys: [],
      engineCount: 1,
      hasEnjoySecret: true
    })
  }
  return null
}

export function e2eStubEngineInspectValue(): InspectAgentToolResult {
  return {
    id: E2E_CHAT_READY_ENGINE_ID as AgentToolId,
    models: [{ id: "stub-e2e", label: "E2E Stub" }],
    authAccount: { loggedIn: true, probed: true, accountName: "e2e-stub" }
  }
}

export function e2eStubEngineInspect(
  id: string,
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): InspectAgentToolResult | null {
  if (packaged || env.ENJOY_E2E_STUB !== "1" || e2eChatReadyKind(env) !== "engine") return null
  if (id !== E2E_CHAT_READY_ENGINE_ID) return null
  return e2eStubEngineInspectValue()
}

/** 夹具把 Claude 标成已登录就绪，不依赖本机 PATH。打包态不覆盖。 */
export function applyE2eStubEngine(
  tools: AgentToolPublic[],
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): AgentToolPublic[] {
  if (packaged || env.ENJOY_E2E_STUB !== "1" || e2eChatReadyKind(env) !== "engine") return tools
  return tools.map((tool) =>
    tool.id === E2E_CHAT_READY_ENGINE_ID
      ? {
          ...tool,
          status: "ready",
          available: true,
          comingSoon: false,
          skillOnly: false,
          authAccount: { loggedIn: true, probed: true, accountName: "e2e-stub" }
        }
      : tool
  )
}
