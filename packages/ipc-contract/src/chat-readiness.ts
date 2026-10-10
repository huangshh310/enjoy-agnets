/**
 * 可对话路线真源：向导末屏与提示共用。发送闸看本轮选中路线，不读全局 ready。
 * 引擎就绪 ≠ 可以开始；本机模型必须 ping 通过（verified:true）才算 ready。
 */
import { z } from "zod"

/** 没有任何可对话路线。区别于密钥无效 / 网络失败 / 额度用完。 */
export const NO_CHAT_ROUTE = "no_chat_route"

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

export const ChatReadiness = z
  .object({
    ready: z.boolean(),
    engineCount: z.number().int().nonnegative(),
    engines: z.array(ChatEngineRoute),
    localModels: z.array(ChatLocalModelRoute),
    apiKeys: z.array(ChatApiKeyRoute)
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
  return route.verified !== false
}

export function chatReadyFromRoutes(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
}): boolean {
  const locals = input.localModels.filter(isVerifiedLocalModel)
  return input.engines.length + locals.length + input.apiKeys.length > 0
}

export function buildChatReadiness(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
  engineCount: number
}): ChatReadiness {
  const engines = [...input.engines]
  const localModels = [...input.localModels]
  const apiKeys = [...input.apiKeys]
  return ChatReadiness.parse({
    ready: chatReadyFromRoutes({ engines, localModels, apiKeys }),
    engineCount: input.engineCount,
    engines,
    localModels,
    apiKeys
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
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "")
    return host === "127.0.0.1" || host === "::1"
  } catch {
    return false
  }
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
