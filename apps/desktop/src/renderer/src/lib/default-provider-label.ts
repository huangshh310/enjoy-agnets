/**
 * 当前默认路线的供应商显示名。缺档案时走人话回落，不摊 id。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

type NamedProvider = { id: string; name: string }

export function defaultProviderLabel(
  readiness: ChatReadiness | undefined,
  providers: readonly NamedProvider[],
  fallback: string
): string {
  const id = readiness?.defaultRoute?.profileId ?? readiness?.apiKeys[0]?.providerId
  if (!id) return fallback
  const name = providers.find((row) => row.id === id)?.name?.trim()
  return name || fallback
}

export function defaultProviderId(readiness: ChatReadiness | undefined): string | undefined {
  return readiness?.defaultRoute?.profileId ?? readiness?.apiKeys[0]?.providerId
}
