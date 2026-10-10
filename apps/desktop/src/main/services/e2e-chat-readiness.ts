/**
 * 仅 ENJOY_E2E_STUB=1 且未打包：向导 / 空态夹具。
 * CHAT_READY=key 的快照带可发默认路线；真 vault 种在 seed 里。
 */
import { buildChatReadiness, type ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

export const E2E_CHAT_READY_KEY_PROFILE_ID = "e2e"
export const E2E_CHAT_READY_MODEL_ID = "stub-e2e"

export type E2eChatReadyKind = "key" | "engine" | "none" | "unverified"

export function e2eChatReadyKind(env: NodeJS.ProcessEnv = process.env): E2eChatReadyKind | undefined {
  const kind = env.ENJOY_E2E_CHAT_READY
  if (kind === "key" || kind === "engine" || kind === "none" || kind === "unverified") return kind
  return undefined
}

export function e2eChatReadinessAllowed(env: NodeJS.ProcessEnv = process.env, packaged = false): boolean {
  return env.ENJOY_E2E_STUB === "1" && !packaged
}

export function e2eChatReadiness(
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): ChatReadiness | null {
  if (!e2eChatReadinessAllowed(env, packaged)) return null
  const kind = e2eChatReadyKind(env)
  if (kind === "key") {
    return buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: E2E_CHAT_READY_KEY_PROFILE_ID, presetId: "openai" }],
      engineCount: 1,
      preferredRuntimeId: "enjoy-local",
      modelId: E2E_CHAT_READY_MODEL_ID
    })
  }
  if (kind === "engine") {
    return buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [],
      apiKeys: [],
      engineCount: 1
    })
  }
  if (kind === "none") {
    return buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [],
      engineCount: 1
    })
  }
  if (kind === "unverified") {
    return buildChatReadiness({
      engines: [],
      localModels: [{ kind: "local_model", service: "ollama", verified: false }],
      apiKeys: [],
      engineCount: 1
    })
  }
  return null
}
