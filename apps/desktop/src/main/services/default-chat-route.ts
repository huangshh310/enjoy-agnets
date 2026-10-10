/**
 * 默认对话路线：显式选择优先；自动收默认只在第一次从无到有时锁一次。
 * 升级时已有可用路线只盖章，不 toast、不改偏好。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { chatRouteAllowsSend, isVerifiedLocalModel } from "@enjoy-agents/ipc-contract/chat-readiness"
import { presetFor } from "@enjoy-agents/providers/presets"
import { getSetting, setSetting } from "./database"
import { readPreferences, writePreferences } from "./preferences"

export const DEFAULT_CHAT_ROUTE_EXPLICIT_KEY = "defaultChatRouteExplicit"
export const ADOPTED_DEFAULT_ROUTE_AT_KEY = "adoptedDefaultRouteAt"
export const SEEN_NO_USABLE_CHAT_ROUTE_KEY = "seenNoUsableChatRoute"

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

export type AdoptDefaultPlan = "skip" | "lock" | "stamp" | "adopt"

/** 纯决策：从无到有才 adopt；升级首次已有路线只 stamp；已有非出厂偏好只盖章。 */
export function planAdoptedDefaultRoute(input: {
  explicit?: boolean
  adoptedAt?: string
  ready?: boolean
  hadNoUsableRoute?: boolean
  currentRuntimeId?: string
  routeRuntimeId?: string
}): AdoptDefaultPlan {
  if (input.explicit || input.adoptedAt) return "skip"
  if (!input.ready || !input.routeRuntimeId) return "skip"
  if (!input.hadNoUsableRoute) return "stamp"
  const current = input.currentRuntimeId?.trim() || "enjoy-local"
  if (current !== "enjoy-local" && current !== input.routeRuntimeId) return "lock"
  return "adopt"
}

export function formatAdoptedRouteFace(input: {
  engineName?: string
  providerName?: string
  modelLabel?: string
  localService?: "ollama" | "lmstudio"
}): string {
  const engine = input.engineName?.trim()
  if (engine) return engine
  const provider = input.providerName?.trim()
  const model = shortAdoptedModelLabel(provider, input.modelLabel)
  const joined = [provider, model].filter(Boolean).join(" · ")
  if (joined) return joined
  if (input.localService === "lmstudio") return "LM Studio"
  if (input.localService === "ollama") return "Ollama"
  return "Enjoy Local"
}

function shortAdoptedModelLabel(provider: string | undefined, label: string | undefined): string | undefined {
  const text = label?.trim()
  if (!text) return undefined
  if (provider && text.startsWith(provider)) {
    const rest = text.slice(provider.length).replace(/^[ ·\-_]+/, "").trim()
    return rest || undefined
  }
  return text
}

export function adoptedRouteLabel(snapshot: ChatReadiness): string {
  const route = snapshot.defaultRoute
  if (!route) return "Enjoy Local"
  if (route.runtimeId !== "enjoy-local") {
    const name = snapshot.engines.find((row) => row.runtimeId === route.runtimeId)?.name
    return formatAdoptedRouteFace({ engineName: name })
  }
  if (route.profileId) {
    const key = snapshot.apiKeys.find((row) => row.providerId === route.profileId)
    const preset = key ? presetFor(key.presetId) : undefined
    const modelLabel = route.modelId
      ? preset?.models.find((row) => row.id === route.modelId)?.label
      : undefined
    return formatAdoptedRouteFace({
      providerName: preset?.name,
      modelLabel
    })
  }
  return formatAdoptedRouteFace({
    localService: snapshot.localModels[0]?.service
  })
}

export type PersistAdoptedResult = { adopted: boolean; hint?: { name: string } }

export type AdoptRouteStore = {
  get(key: string): string | undefined
  set(key: string, value: string): void
  readRuntimeId(): string | undefined
  writeRuntimeId(runtimeId: string): void
}

function liveAdoptStore(): AdoptRouteStore {
  return {
    get: getSetting,
    set: setSetting,
    readRuntimeId: () => readPreferences().runtimeId,
    writeRuntimeId: (runtimeId) => {
      writePreferences({ runtimeId })
    }
  }
}

/** inspect + ping 都结束前不要记。记的是闸不放行，不是 !ready（远端 Ollama 闸仍放行）。 */
export function shouldNoteSeenNoUsableRoute(input: {
  gateAllows: boolean
  probesSettled: boolean
  adoptedAt?: string
}): boolean {
  return input.probesSettled && !input.gateAllows && !input.adoptedAt
}

function snapshotGateAllows(snapshot: ChatReadiness): boolean {
  return chatRouteAllowsSend({
    runtimeId: snapshot.defaultRoute?.runtimeId ?? "enjoy-local",
    hasEnjoySecret: snapshot.hasEnjoySecret === undefined ? "unknown" : snapshot.hasEnjoySecret,
    verifiedLocal: snapshot.localModels.some(isVerifiedLocalModel)
  })
}

function noteSeenNoUsableRoute(
  store: AdoptRouteStore,
  gateAllows: boolean,
  probesSettled: boolean
): void {
  if (
    !shouldNoteSeenNoUsableRoute({
      gateAllows,
      probesSettled,
      adoptedAt: store.get(ADOPTED_DEFAULT_ROUTE_AT_KEY)
    })
  ) {
    return
  }
  store.set(SEEN_NO_USABLE_CHAT_ROUTE_KEY, "1")
}

/** 第一次从「闸不放行」到 ready 才 adopt；盖章 / 见过无路线看闸。 */
export function persistAdoptedDefaultRoute(
  snapshot: ChatReadiness,
  opts?: { probesSettled?: boolean; store?: AdoptRouteStore }
): PersistAdoptedResult {
  const store = opts?.store ?? liveAdoptStore()
  noteSeenNoUsableRoute(store, snapshotGateAllows(snapshot), opts?.probesSettled !== false)
  const plan = planAdoptedDefaultRoute({
    explicit: store.get(DEFAULT_CHAT_ROUTE_EXPLICIT_KEY) === "1",
    adoptedAt: store.get(ADOPTED_DEFAULT_ROUTE_AT_KEY),
    ready: snapshot.ready,
    hadNoUsableRoute: store.get(SEEN_NO_USABLE_CHAT_ROUTE_KEY) === "1",
    currentRuntimeId: store.readRuntimeId(),
    routeRuntimeId: snapshot.defaultRoute?.runtimeId
  })
  if (plan === "skip") return { adopted: false }
  const now = String(Date.now())
  store.set(ADOPTED_DEFAULT_ROUTE_AT_KEY, now)
  if (plan === "stamp" || plan === "lock") return { adopted: false }
  const route = snapshot.defaultRoute
  if (!route) return { adopted: false }
  const current = store.readRuntimeId()
  const modelId = store.get("defaultModelId") || ""
  if (route.runtimeId !== current) {
    store.writeRuntimeId(route.runtimeId)
  }
  if (route.modelId && route.modelId !== modelId) {
    store.set("defaultModelId", route.modelId)
  }
  return { adopted: true, hint: { name: adoptedRouteLabel(snapshot) } }
}
