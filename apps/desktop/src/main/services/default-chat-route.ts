/**
 * 默认对话路线：显式选择优先；自动收默认只在第一次连上时锁一次。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { getSetting, setSetting } from "./database"
import { readPreferences, writePreferences } from "./preferences"

export const DEFAULT_CHAT_ROUTE_EXPLICIT_KEY = "defaultChatRouteExplicit"
export const ADOPTED_DEFAULT_ROUTE_AT_KEY = "adoptedDefaultRouteAt"

export function isDefaultChatRouteExplicit(): boolean {
  return getSetting(DEFAULT_CHAT_ROUTE_EXPLICIT_KEY) === "1"
}

/** 设为主引擎 / setDefaultModel / setPreferences.runtimeId。 */
export function markDefaultChatRouteExplicit(): void {
  setSetting(DEFAULT_CHAT_ROUTE_EXPLICIT_KEY, "1")
}

export function adoptedDefaultRouteAt(): string | undefined {
  return getSetting(ADOPTED_DEFAULT_ROUTE_AT_KEY)
}

export function defaultChatRouteAssembleInput(): {
  preferredRuntimeId?: string
  explicit?: boolean
  modelId?: string
} {
  const prefs = readPreferences()
  return {
    preferredRuntimeId: prefs.runtimeId,
    explicit: isDefaultChatRouteExplicit(),
    modelId: getSetting("defaultModelId") || undefined
  }
}

export type AdoptDefaultPlan = "skip" | "lock" | "adopt"

/** 纯决策：只在「从无到有」且未显式、未锁过时 adopt；已有非出厂偏好只盖章不改写。 */
export function planAdoptedDefaultRoute(input: {
  explicit?: boolean
  adoptedAt?: string
  ready?: boolean
  currentRuntimeId?: string
  routeRuntimeId?: string
}): AdoptDefaultPlan {
  if (input.explicit || input.adoptedAt) return "skip"
  if (!input.ready || !input.routeRuntimeId) return "skip"
  const current = input.currentRuntimeId?.trim() || "enjoy-local"
  if (current !== "enjoy-local" && current !== input.routeRuntimeId) return "lock"
  return "adopt"
}

export function adoptedRouteLabel(snapshot: ChatReadiness): string {
  const route = snapshot.defaultRoute
  if (!route) return "Enjoy Local"
  if (route.runtimeId !== "enjoy-local") {
    return snapshot.engines.find((row) => row.runtimeId === route.runtimeId)?.name ?? route.runtimeId
  }
  if (route.profileId) {
    const key = snapshot.apiKeys.find((row) => row.providerId === route.profileId)
    return key?.presetId ?? "Enjoy Local"
  }
  return "Enjoy Local"
}

export type PersistAdoptedResult = { adopted: boolean; hint?: { name: string } }

/** 第一次从「没有可用路线」到「有路线」时写回偏好，之后不再改 prefs.runtimeId。 */
export function persistAdoptedDefaultRoute(snapshot: ChatReadiness): PersistAdoptedResult {
  const plan = planAdoptedDefaultRoute({
    explicit: isDefaultChatRouteExplicit(),
    adoptedAt: adoptedDefaultRouteAt(),
    ready: snapshot.ready,
    currentRuntimeId: readPreferences().runtimeId,
    routeRuntimeId: snapshot.defaultRoute?.runtimeId
  })
  if (plan === "skip") return { adopted: false }
  const now = String(Date.now())
  setSetting(ADOPTED_DEFAULT_ROUTE_AT_KEY, now)
  if (plan === "lock") return { adopted: false }
  const route = snapshot.defaultRoute
  if (!route) return { adopted: false }
  const prefs = readPreferences()
  const modelId = getSetting("defaultModelId") || ""
  if (route.runtimeId !== prefs.runtimeId) {
    writePreferences({ runtimeId: route.runtimeId })
  }
  if (route.modelId && route.modelId !== modelId) {
    setSetting("defaultModelId", route.modelId)
  }
  return { adopted: true, hint: { name: adoptedRouteLabel(snapshot) } }
}
