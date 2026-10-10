/**
 * 渲染层认 main 可选下发的 defaultRoute。合约还没加字段时也要能吃，禁止 .strict() 整包丢掉。
 * 不写 preferences，避免把「系统默认」做成用户显式选择。
 */
import {
  type ChatApiKeyRoute,
  type ChatEngineRoute,
  type ChatLocalModelRoute,
  type ChatReadiness
} from "@enjoy-agents/ipc-contract/chat-readiness"
import { DEFAULT_RUNTIME_ID } from "./session-runtime.ts"

export type ChatDefaultRoute = ChatEngineRoute | ChatLocalModelRoute | ChatApiKeyRoute

export type ChatReadinessView = ChatReadiness & { defaultRoute?: ChatDefaultRoute }

const KNOWN_KEYS = ["ready", "engineCount", "engines", "localModels", "apiKeys"] as const

export function takeDefaultRoute(raw: unknown): ChatDefaultRoute | undefined {
  if (typeof raw === "string" && raw.trim()) {
    return { kind: "engine", runtimeId: raw.trim(), name: raw.trim() }
  }
  if (!raw || typeof raw !== "object") return undefined
  const row = raw as Record<string, unknown>
  if (row.kind === "engine" && typeof row.runtimeId === "string" && row.runtimeId.trim()) {
    return {
      kind: "engine",
      runtimeId: row.runtimeId.trim(),
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : row.runtimeId.trim()
    }
  }
  if (row.kind === "local_model" && (row.service === "ollama" || row.service === "lmstudio")) {
    return {
      kind: "local_model",
      service: row.service,
      verified: typeof row.verified === "boolean" ? row.verified : undefined
    }
  }
  if (
    row.kind === "api_key" &&
    typeof row.providerId === "string" &&
    row.providerId.trim() &&
    typeof row.presetId === "string" &&
    row.presetId.trim()
  ) {
    return { kind: "api_key", providerId: row.providerId.trim(), presetId: row.presetId.trim() }
  }
  return undefined
}

/** 抽出已知字段，多出来的 defaultRoute 等不进 Zod .strict()。 */
export function knownReadinessFields(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const row = raw as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const key of KNOWN_KEYS) next[key] = row[key]
  return next
}

export function runtimeIdFromDefaultRoute(route: ChatDefaultRoute | undefined): string | undefined {
  if (!route) return undefined
  if (route.kind === "engine") return route.runtimeId
  return DEFAULT_RUNTIME_ID
}

export function shouldApplyDefaultRoute(input: {
  explicitRuntime: boolean
  sessionBound: boolean
}): boolean {
  return !input.explicitRuntime && !input.sessionBound
}

export function pickModelForDefaultRoute<T extends { id: string; provider?: string; providerId?: string }>(
  route: ChatDefaultRoute | undefined,
  models: readonly T[]
): T | undefined {
  if (!route || models.length === 0) return undefined
  if (route.kind === "api_key") {
    return (
      models.find((model) => model.providerId === route.providerId) ??
      models.find((model) => model.provider === route.presetId)
    )
  }
  if (route.kind === "local_model") {
    return models.find(
      (model) => model.provider === route.service || model.providerId === route.service
    )
  }
  return undefined
}
