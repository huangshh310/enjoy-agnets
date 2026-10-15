/**
 * 当前默认路线的供应商显示名。快照 profileId 对不上列表时，只落到正在用（active）且有钥、未停用的档案。
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

/**
 * 快照 id 在列表里就用；否则只认「当前使用中（active）+ 有钥 + 未停用」的档案（夹具 id 对不上 prv_*）。
 * leo BLOCK（#136 r3）：不再回落「任意有钥档案」或列表里不存在的快照 id——会打开错的 / 不存在的档案。
 * 解析不出返回 undefined，调用方（goFixKey）改开「添加 API 密钥」。
 */
export function resolveDefaultProviderId(
  readiness: ChatReadiness | undefined,
  providers: readonly ListedProvider[]
): string | undefined {
  const snap = defaultProviderId(readiness)
  if (snap && providers.some((row) => row.id === snap)) return snap
  const activeKeyed = providers.find((row) => row.active && row.hasKey && row.enabled !== false)
  return activeKeyed?.id
}
