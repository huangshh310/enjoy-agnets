/**
 * 默认对话路线持久化：显式选择 vs 第一次连上的可用路线。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { getSetting, setSetting } from "./database"
import { readPreferences, writePreferences } from "./preferences"

export const DEFAULT_CHAT_ROUTE_EXPLICIT_KEY = "defaultChatRouteExplicit"

export function isDefaultChatRouteExplicit(): boolean {
  return getSetting(DEFAULT_CHAT_ROUTE_EXPLICIT_KEY) === "1"
}

/** 设为主引擎 / setDefaultModel / setPreferences.runtimeId。 */
export function markDefaultChatRouteExplicit(): void {
  setSetting(DEFAULT_CHAT_ROUTE_EXPLICIT_KEY, "1")
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

/** 未显式选择时，把第一次连上的可用路线写进偏好，不翻显式旗标。 */
export function persistAdoptedDefaultRoute(snapshot: ChatReadiness): void {
  if (isDefaultChatRouteExplicit()) return
  const route = snapshot.defaultRoute
  if (!route) return
  const prefs = readPreferences()
  const modelId = getSetting("defaultModelId") || ""
  if (route.runtimeId !== prefs.runtimeId) {
    writePreferences({ runtimeId: route.runtimeId })
  }
  if (route.modelId && route.modelId !== modelId) {
    setSetting("defaultModelId", route.modelId)
  }
}
