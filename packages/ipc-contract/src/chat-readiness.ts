/**
 * 可对话路线真源：向导末屏、默认路线与发送闸。
 * ready = 新对话默认路线已验证可发；闸更宽（ready ⇒ 放行）。
 */
import { z } from "zod"
import { chatRouteAllowsSend, NO_CHAT_ROUTE } from "./chat-route-gate.ts"

export {
  chatRouteAllowsSend,
  chatRouteGateCode,
  chatRouteGateKind,
  NO_CHAT_ROUTE,
  type ChatRouteGateInput,
  type ChatRouteGateKind
} from "./chat-route-gate.ts"

export const ChatReadinessInput = z.object({}).strict()
export type ChatReadinessInput = z.infer<typeof ChatReadinessInput>

export const ChatEngineRoute = z
  .object({
    kind: z.literal("engine"),
    runtimeId: z.string().min(1),
    name: z.string().min(1)
  })
  .strict()
export type ChatEngineRoute = z.infer<typeof ChatEngineRoute>

export const ChatLocalModelRoute = z
  .object({
    kind: z.literal("local_model"),
    service: z.enum(["ollama", "lmstudio"]),
    /** 现场 ping 通过才为 true。远端档案（非 127.0.0.1）不 ping，为 false，不算 ready。 */
    verified: z.boolean().optional()
  })
  .strict()
export type ChatLocalModelRoute = z.infer<typeof ChatLocalModelRoute>

/** 发送闸稳定码。main `agent.run` 失败回 `{ ok:false, code }`，不要 throw 以免 IPC 加前缀。 */
export const SendGateCode = z.enum([NO_CHAT_ROUTE])
export type SendGateCode = z.infer<typeof SendGateCode>

export const AgentRunOk = z.object({ ok: z.literal(true), runId: z.string().min(1) }).strict()
export type AgentRunOk = z.infer<typeof AgentRunOk>

export const AgentRunBlocked = z.object({ ok: z.literal(false), code: SendGateCode }).strict()
export type AgentRunBlocked = z.infer<typeof AgentRunBlocked>

export const AgentRunResult = z.discriminatedUnion("ok", [AgentRunOk, AgentRunBlocked])
export type AgentRunResult = z.infer<typeof AgentRunResult>

export function agentRunBlockedCode(result: unknown): SendGateCode | null {
  const parsed = AgentRunResult.safeParse(result)
  return parsed.success && !parsed.data.ok ? parsed.data.code : null
}

/** 工作流 / 自动化读 runId；被闸时抛稳定码，不要当成功。 */
export function requireAgentRunId(result: unknown): string {
  const parsed = AgentRunResult.safeParse(result)
  if (parsed.success) {
    if (!parsed.data.ok) throw new Error(parsed.data.code)
    return parsed.data.runId
  }
  const runId = (result as { runId?: unknown })?.runId
  if (typeof runId === "string" && runId.length > 0) return runId
  throw new Error("agent.run returned no runId")
}

export const ChatApiKeyRoute = z
  .object({
    kind: z.literal("api_key"),
    providerId: z.string().min(1),
    presetId: z.string().min(1)
  })
  .strict()
export type ChatApiKeyRoute = z.infer<typeof ChatApiKeyRoute>

/** 新对话将使用的默认路线。renderer 只消费，不自己猜 hasKey。 */
export const ChatDefaultRoute = z
  .object({
    runtimeId: z.string().min(1),
    modelId: z.string().min(1).optional(),
    profileId: z.string().min(1).optional()
  })
  .strict()
export type ChatDefaultRoute = z.infer<typeof ChatDefaultRoute>

export const ChatReadiness = z
  .object({
    ready: z.boolean(),
    engineCount: z.number().int().nonnegative(),
    engines: z.array(ChatEngineRoute),
    localModels: z.array(ChatLocalModelRoute),
    apiKeys: z.array(ChatApiKeyRoute),
    /** 单字段坏掉不丢整张快照。 */
    defaultRoute: ChatDefaultRoute.optional().catch(undefined),
    /** 路由 hasSecret()；缺省时渲染闸当 uncertain。单字段坏不丢整张。 */
    hasEnjoySecret: z.boolean().optional().catch(undefined),
    /** 第一次从无到有才带，给 toast。单字段坏不丢整张。 */
    adoptedHint: z.object({ name: z.string().min(1) }).strict().optional().catch(undefined),
    /**
     * 系统钥匙串能否加密存密钥。缺省 / 坏字段 `.catch(true)`，旧快照不当成挂掉。
     * Linux `basic_text` 算 false。禁止明文回落。
     */
    secretStorageAvailable: z.boolean().catch(true)
  })
  .strict()
export type ChatReadiness = z.infer<typeof ChatReadiness>

export const ChatReadinessChanged = ChatReadiness
export type ChatReadinessChanged = ChatReadiness

export type AvailableEngineTool = {
  id: string
  status: string
  name?: string
  skillOnly?: boolean
  comingSoon?: boolean
}

export type PublicKeyProvider = {
  id: string
  kind: string
  enabled?: boolean
  hasKey?: boolean
  requiresKey?: boolean
  /** 当前 Enjoy Local 档案。缺省时组装按第一份启用档案。 */
  active?: boolean
  /** 用来判断远端 Ollama / LM Studio，不进快照。 */
  baseURL?: string
}

/** 已装 / 已探测到的引擎数。enjoy-local 算一台引擎，但不等于可以对话。 */
export function showsAvailableEngine(tool: AvailableEngineTool): boolean {
  if (tool.skillOnly || tool.comingSoon) return false
  if (tool.status === "comingSoon" || tool.status === "skillOnly") return false
  return tool.id === "enjoy-local" || tool.status === "ready"
}

export function countAvailableEngines(tools: readonly AvailableEngineTool[]): number {
  return tools.filter(showsAvailableEngine).length
}

export function isVerifiedLocalModel(route: ChatLocalModelRoute): boolean {
  return route.verified === true
}

export type ResolveDefaultChatRouteInput = {
  /** 用户亲手选过默认（设为主引擎 / setDefaultModel / setPreferences.runtimeId）。 */
  explicit?: boolean
  preferredRuntimeId?: string
  modelId?: string
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
  /** 路由 hasSecret()：当前档案，不是「任意档案有密钥」。 */
  hasEnjoySecret?: boolean
  /** 当前档案若是带密钥的，才写 defaultRoute.profileId。 */
  activeKeyProfileId?: string | null
}

function chatDefaultRouteOf(
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

function activeKeyProfileIdOf(input: ResolveDefaultChatRouteInput): string | undefined {
  if (input.activeKeyProfileId !== undefined) return input.activeKeyProfileId ?? undefined
  if (input.hasEnjoySecret === false) return undefined
  return input.apiKeys[0]?.providerId
}

function enjoySecretOf(input: Pick<ResolveDefaultChatRouteInput, "hasEnjoySecret" | "apiKeys">): boolean {
  if (input.hasEnjoySecret !== undefined) return input.hasEnjoySecret
  return input.apiKeys.length > 0
}

/** 新对话默认路线。未显式选择时，第一次连上的可用路线优先于出厂 enjoy-local。 */
export function resolveDefaultChatRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute {
  const preferred = input.preferredRuntimeId?.trim() || "enjoy-local"
  const modelId = input.modelId?.trim() || undefined
  const keyProfile = preferred === "enjoy-local" ? activeKeyProfileIdOf(input) : undefined
  if (input.explicit) return chatDefaultRouteOf(preferred, modelId, keyProfile)
  const keep = chatDefaultRouteOf(preferred, modelId, keyProfile)
  if (defaultRouteUsable(keep, input)) return keep
  return firstUsableDefaultRoute(input) ?? chatDefaultRouteOf("enjoy-local", modelId)
}

function defaultRouteUsable(
  route: ChatDefaultRoute,
  input: Pick<ResolveDefaultChatRouteInput, "apiKeys" | "localModels" | "hasEnjoySecret">
): boolean {
  return chatRouteAllowsSend({
    runtimeId: route.runtimeId,
    hasEnjoySecret: enjoySecretOf(input),
    verifiedLocal: input.localModels.some(isVerifiedLocalModel)
  })
}

function firstUsableDefaultRoute(input: ResolveDefaultChatRouteInput): ChatDefaultRoute | null {
  const modelId = input.modelId?.trim() || undefined
  const keyProfile = activeKeyProfileIdOf(input)
  if (enjoySecretOf(input)) {
    return chatDefaultRouteOf("enjoy-local", modelId, keyProfile)
  }
  if (input.localModels.some(isVerifiedLocalModel)) {
    return { runtimeId: "enjoy-local", ...(modelId ? { modelId } : {}) }
  }
  const engine = input.engines[0]
  if (engine) return { runtimeId: engine.runtimeId }
  return null
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
}): boolean {
  const route = resolveDefaultChatRoute(input)
  return defaultRouteUsable(route, input)
}

export function buildChatReadiness(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
  engineCount: number
  preferredRuntimeId?: string
  explicit?: boolean
  modelId?: string
  hasEnjoySecret?: boolean
  activeKeyProfileId?: string | null
  adoptedHint?: { name: string }
}): ChatReadiness {
  const engines = [...input.engines]
  const localModels = [...input.localModels]
  const apiKeys = [...input.apiKeys]
  const defaultRoute = resolveDefaultChatRoute({
    explicit: input.explicit,
    preferredRuntimeId: input.preferredRuntimeId,
    modelId: input.modelId,
    engines,
    localModels,
    apiKeys,
    hasEnjoySecret: input.hasEnjoySecret,
    activeKeyProfileId: input.activeKeyProfileId
  })
  return ChatReadiness.parse({
    ready: defaultRouteUsable(defaultRoute, {
      apiKeys,
      localModels,
      hasEnjoySecret: input.hasEnjoySecret
    }),
    engineCount: input.engineCount,
    engines,
    localModels,
    apiKeys,
    defaultRoute,
    hasEnjoySecret: enjoySecretOf(input),
    ...(input.adoptedHint ? { adoptedHint: input.adoptedHint } : {})
  })
}

/** 已登录且 PATH 就绪的外置引擎。enjoy-local 永远不进这条。 */
export function signedInEngineRoutes(
  tools: readonly AvailableEngineTool[],
  loggedInIds: ReadonlySet<string>
): ChatEngineRoute[] {
  return tools
    .filter((tool) => showsAvailableEngine(tool) && tool.id !== "enjoy-local" && loggedInIds.has(tool.id))
    .map((tool) => ({
      kind: "engine" as const,
      runtimeId: tool.id,
      name: tool.name?.trim() || tool.id
    }))
}

/** 只要存在 + 预设 id；禁止带密钥。 */
export function apiKeyRoutes(providers: readonly PublicKeyProvider[]): ChatApiKeyRoute[] {
  return providers
    .filter((row) => row.enabled !== false && row.requiresKey && row.hasKey)
    .map((row) => ({ kind: "api_key" as const, providerId: row.id, presetId: row.kind }))
}

/** 只认 127.0.0.1 / ::1；localhost 与局域网不算，不 ping。空地址当本机默认。 */
export function isLoopbackModelBaseUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true
  const host = loopbackHostOf(url)
  return host === "127.0.0.1" || host === "::1"
}

function loopbackHostOf(url: string): string {
  const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
  const authority = withoutScheme.split("/")[0] ?? ""
  const hostPort = authority.includes("@") ? (authority.split("@").pop() ?? "") : authority
  if (hostPort.startsWith("[")) {
    const end = hostPort.indexOf("]")
    return end > 0 ? hostPort.slice(1, end) : ""
  }
  return hostPort.split(":")[0] ?? ""
}

/**
 * 本机路线：现场 ping 通过 → verified:true。
 * 远端档案（非 127.0.0.1）不 ping → verified:false，不算 ready。
 * 已启用但没 ping 过的本机档案不算路线（禁止靠档案冒充就绪）。
 */
export function localModelRoutes(
  live: readonly ("ollama" | "lmstudio")[],
  remoteUnverified: readonly string[] = []
): ChatLocalModelRoute[] {
  const routes: ChatLocalModelRoute[] = []
  const seen = new Set<"ollama" | "lmstudio">()
  for (const service of live) {
    seen.add(service)
    routes.push({ kind: "local_model", service, verified: true })
  }
  for (const kind of remoteUnverified) {
    if (kind !== "ollama" && kind !== "lmstudio") continue
    if (seen.has(kind)) continue
    seen.add(kind)
    routes.push({ kind: "local_model", service: kind, verified: false })
  }
  return routes
}

export function missingChatRouteCode(ready: boolean): typeof NO_CHAT_ROUTE | null {
  return ready ? null : NO_CHAT_ROUTE
}
