/**
 * 当前默认路线的供应商显示名。快照 profileId 对不上列表时，落到正在用的有钥档案。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

export type ListedProvider = {
  id: string
  name?: string
  active?: boolean
  hasKey?: boolean
  enabled?: boolean
}

export function defaultProviderLabel(
  readiness: ChatReadiness | undefined,
  providers: readonly ListedProvider[],
  fallback: string
): string {
  const id = resolveDefaultProviderId(readiness, providers)
  const named = id ? providers.find((row) => row.id === id)?.name?.trim() : undefined
  return named || fallback
}

export function defaultProviderId(readiness: ChatReadiness | undefined): string | undefined {
  return readiness?.defaultRoute?.profileId ?? readiness?.apiKeys[0]?.providerId
}

/** 快照 id 在列表里就用；否则用当前启用且有钥的档案，避免夹具 id 对不上 prv_*。 */
export function resolveDefaultProviderId(
  readiness: ChatReadiness | undefined,
  providers: readonly ListedProvider[]
): string | undefined {
  const snap = defaultProviderId(readiness)
  if (snap && providers.some((row) => row.id === snap)) return snap
  const activeKeyed = providers.find((row) => row.active && row.hasKey && row.enabled !== false)
  if (activeKeyed) return activeKeyed.id
  return providers.find((row) => row.hasKey)?.id ?? snap
}
