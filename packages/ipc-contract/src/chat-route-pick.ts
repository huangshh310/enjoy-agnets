/**
 * 默认路线挑选：ok 先于 unverified；全 invalid 不 ready。
 * ready ⇒ 闸放行。
 */
import { chatRouteAllowsSend } from "./chat-route-gate.ts"
import type { CredentialCheck, CredentialCheckState } from "./credential-check.ts"
import type {
  ChatApiKeyRoute,
  ChatDefaultRoute,
  ChatEngineRoute,
  ChatLocalModelRoute,
  ResolveDefaultChatRouteInput
} from "./chat-readiness.ts"

export function chatDefaultRouteOf(
  runtimeId: string,
  modelId?: string,
  profileId?: string
): ChatDefaultRoute {
  return {
    runtimeId,
    ...(modelId ? { modelId } : {}),
    ...(profileId ? { profileId } : {})
  }
}

export function activeKeyProfileIdOf(input: ResolveDefaultChatRouteInput): string | undefined {
  if (input.activeKeyProfileId !== undefined) return input.activeKeyProfileId ?? undefined
  if (input.hasEnjoySecret === false) return undefined
  return input.apiKeys[0]?.providerId
}

export function enjoySecretOf(
  input: Pick<ResolveDefaultChatRouteInput, "hasEnjoySecret" | "apiKeys">
): boolean {
  if (input.hasEnjoySecret !== undefined) return input.hasEnjoySecret
  return input.apiKeys.length > 0
}

/** 新对话默认路线。未显式选择时，第一次连上的可用路线优先于出厂 enjoy-local。 */
export function resolveDefaultChatRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute {
  const preferred = input.preferredRuntimeId?.trim() || "enjoy-local"
  const modelId = input.modelId?.trim() || undefined
  const keyProfile =
    preferred === "enjoy-local" ? pickKeyedProfileId(input) ?? activeKeyProfileIdOf(input) : undefined
  if (input.explicit) return chatDefaultRouteOf(preferred, modelId, activeKeyProfileIdOf(input))
  const keep = chatDefaultRouteOf(preferred, modelId, keyProfile)
  if (preferred === "enjoy-local" && keyProfile && keyedStateOf(input, keyProfile) !== "invalid") {
    return keep
  }
  if (defaultRouteUsable(keep, input)) return keep
  return firstUsableDefaultRoute(input) ?? chatDefaultRouteOf("enjoy-local", modelId)
}

export function defaultRouteUsable(
  route: ChatDefaultRoute,
  input: Pick<
    ResolveDefaultChatRouteInput,
    "apiKeys" | "localModels" | "hasEnjoySecret" | "credentialState" | "keyStates"
  >
): boolean {
  return chatRouteAllowsSend({
    runtimeId: route.runtimeId,
    hasEnjoySecret: enjoySecretOf(input),
    verifiedLocal: input.localModels.some((row) => row.verified === true),
    credentialState: routeCredentialState(route, input)
  })
}

/** ready：带密钥档案只要不是 invalid。unverified / 未检都 ready，首发再验。 */
export function defaultRouteReady(
  route: ChatDefaultRoute,
  input: Pick<
    ResolveDefaultChatRouteInput,
    "apiKeys" | "localModels" | "hasEnjoySecret" | "credentialState" | "keyStates" | "engines"
  >
): boolean {
  if (route.runtimeId === "enjoy-local" && enjoySecretOf(input) && input.apiKeys.length > 0) {
    const profileId = route.profileId ?? pickKeyedProfileId(input)
    return Boolean(profileId) && keyedStateOf(input, profileId) !== "invalid"
  }
  return defaultRouteUsable(route, input)
}

function firstUsableDefaultRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute | null {
  const modelId = input.modelId?.trim() || undefined
  const keyProfile = pickKeyedProfileId(input)
  if (keyProfile && keyedStateOf(input, keyProfile) !== "invalid") {
    return chatDefaultRouteOf("enjoy-local", modelId, keyProfile)
  }
  if (input.localModels.some((row) => row.verified === true)) {
    return { runtimeId: "enjoy-local", ...(modelId ? { modelId } : {}) }
  }
  const engine = input.engines[0]
  if (engine) return { runtimeId: engine.runtimeId }
  return null
}

/** 带密钥档案：ok 先于 unverified；全 invalid 则没有可挑的。缺检当 unverified。 */
export function pickKeyedProfileId(input: ResolveDefaultChatRouteInput): string | undefined {
  if (!enjoySecretOf(input) || input.apiKeys.length === 0) return undefined
  const ranked = [...input.apiKeys].sort(
    (left, right) =>
      keyedRank(keyedStateOf(input, left.providerId)) - keyedRank(keyedStateOf(input, right.providerId))
  )
  const best = ranked[0]
  if (!best || keyedStateOf(input, best.providerId) === "invalid") return undefined
  return best.providerId
}

function keyedRank(state: CredentialCheckState | undefined): number {
  if (state === "ok") return 0
  if (state === "invalid") return 2
  return 1
}

export function keyedStateOf(
  input: Pick<ResolveDefaultChatRouteInput, "keyStates" | "credentialState" | "activeKeyProfileId" | "apiKeys">,
  profileId: string | undefined
): CredentialCheckState | undefined {
  if (!profileId) return input.credentialState
  return input.keyStates?.[profileId] ?? (profileId === activeKeyProfileIdOf(input) ? input.credentialState : undefined)
}

function routeCredentialState(
  route: ChatDefaultRoute,
  input: Pick<ResolveDefaultChatRouteInput, "keyStates" | "credentialState" | "activeKeyProfileId" | "apiKeys">
): CredentialCheckState | undefined {
  if (route.runtimeId !== "enjoy-local") return undefined
  return keyedStateOf(input, route.profileId)
}

export function chatReadyFromRoutes(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
  preferredRuntimeId?: string
  explicit?: boolean
  modelId?: string
  hasEnjoySecret?: boolean
  activeKeyProfileId?: string | null
  credentialState?: CredentialCheck["state"]
  keyStates?: Readonly<Record<string, CredentialCheckState>>
}): boolean {
  const route = resolveDefaultChatRoute(input)
  return defaultRouteReady(route, input)
}

export function keyStatesFromChecks(
  checks: Readonly<Record<string, CredentialCheck>> | undefined
): Record<string, CredentialCheckState> | undefined {
  if (!checks) return undefined
  const out: Record<string, CredentialCheckState> = {}
  for (const [id, check] of Object.entries(checks)) out[id] = check.state
  return out
}
