/**
 * 默认路线挑选。ready 与闸共用 runKeyProfileIdOf / runCredentialStateOf：
 * ready = 闸放行 + 额外条件，构造上 ready ⇒ 闸放行。全 invalid 不 ready。
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

type KeyedPickInput = Pick<
  ResolveDefaultChatRouteInput,
  "apiKeys" | "hasEnjoySecret" | "keyStates" | "credentialState" | "activeKeyProfileId"
>

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

export function activeKeyProfileIdOf(input: KeyedPickInput): string | undefined {
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

/**
 * 这次发送会用哪份带密钥档案。ready 与发送闸都只认它（resolveRunSecret 读的就是当前档案）。
 * 不再在未 adopt 时另挑 ok 档案：那样 ready 描述的档案与实际发送的不是同一份。
 */
export function runKeyProfileIdOf(input: KeyedPickInput): string | undefined {
  return activeKeyProfileIdOf(input)
}

/** 这次发送所用档案的校验态；闸的 credentialState 必须来自这里。 */
export function runCredentialStateOf(input: KeyedPickInput): CredentialCheckState | undefined {
  return keyedStateOf(input, runKeyProfileIdOf(input))
}

/** 新对话默认路线。未显式选择时，第一次连上的可用路线优先于出厂 enjoy-local。 */
export function resolveDefaultChatRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute {
  const preferred = input.preferredRuntimeId?.trim() || "enjoy-local"
  const modelId = input.modelId?.trim() || undefined
  const keep = chatDefaultRouteOf(
    preferred,
    modelId,
    preferred === "enjoy-local" ? runKeyProfileIdOf(input) : undefined
  )
  if (input.explicit || input.adopted) return keep
  if (defaultRouteReady(keep, input)) return keep
  return firstReadyDefaultRoute(input) ?? keep
}

export function defaultRouteUsable(
  route: ChatDefaultRoute,
  input: Pick<
    ResolveDefaultChatRouteInput,
    "apiKeys" | "localModels" | "hasEnjoySecret" | "credentialState" | "keyStates" | "activeKeyProfileId"
  >
): boolean {
  return chatRouteAllowsSend({
    runtimeId: route.runtimeId,
    hasEnjoySecret: enjoySecretOf(input),
    verifiedLocal: input.localModels.some((row) => row.verified === true),
    credentialState: route.runtimeId === "enjoy-local" ? runCredentialStateOf(input) : undefined
  })
}

/**
 * ready = 闸放行 + 额外条件（构造上 ready ⇒ 闸放行）。
 * 额外：CLI 须已登录；带密钥须有当前档案；无密钥本机须 ping 过。
 */
export function defaultRouteReady(
  route: ChatDefaultRoute,
  input: Pick<
    ResolveDefaultChatRouteInput,
    | "apiKeys"
    | "localModels"
    | "hasEnjoySecret"
    | "credentialState"
    | "keyStates"
    | "engines"
    | "activeKeyProfileId"
  >
): boolean {
  if (!defaultRouteUsable(route, input)) return false
  if (route.runtimeId !== "enjoy-local") {
    return input.engines.some((row) => row.runtimeId === route.runtimeId)
  }
  if (enjoySecretOf(input) && runKeyProfileIdOf(input)) return true
  return input.localModels.some((row) => row.verified === true)
}

function firstReadyDefaultRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute | null {
  const modelId = input.modelId?.trim() || undefined
  const candidates: ChatDefaultRoute[] = [
    chatDefaultRouteOf("enjoy-local", modelId, runKeyProfileIdOf(input)),
    ...input.engines.map((row) => chatDefaultRouteOf(row.runtimeId))
  ]
  return candidates.find((route) => defaultRouteReady(route, input)) ?? null
}

export function keyedStateOf(
  input: KeyedPickInput,
  profileId: string | undefined
): CredentialCheckState | undefined {
  if (!profileId) return input.credentialState
  return input.keyStates?.[profileId] ?? (profileId === activeKeyProfileIdOf(input) ? input.credentialState : undefined)
}

export function chatReadyFromRoutes(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
  preferredRuntimeId?: string
  explicit?: boolean
  adopted?: boolean
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
