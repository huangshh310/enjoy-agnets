/**
 * 可对话路线真源：向导末屏与无密钥发送闸共用。
 * 引擎就绪 ≠ 可以开始；enjoy-local 没连模型不算 ready。
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
    service: z.enum(["ollama", "lmstudio"])
  })
  .strict()
export type ChatLocalModelRoute = z.infer<typeof ChatLocalModelRoute>

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

export function chatReadyFromRoutes(input: {
  engines: readonly ChatEngineRoute[]
  localModels: readonly ChatLocalModelRoute[]
  apiKeys: readonly ChatApiKeyRoute[]
}): boolean {
  return input.engines.length + input.localModels.length + input.apiKeys.length > 0
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

/** 现场探测 ∪ 已启用的本机档案（e2e stub 的 Ollama 也算）。 */
export function localModelRoutes(
  live: readonly ("ollama" | "lmstudio")[],
  enabledKinds: readonly string[]
): ChatLocalModelRoute[] {
  const services = new Set<"ollama" | "lmstudio">()
  for (const service of live) services.add(service)
  for (const kind of enabledKinds) {
    if (kind === "ollama" || kind === "lmstudio") services.add(kind)
  }
  return [...services].map((service) => ({ kind: "local_model" as const, service }))
}

export function missingChatRouteCode(ready: boolean): typeof NO_CHAT_ROUTE | null {
  return ready ? null : NO_CHAT_ROUTE
}
