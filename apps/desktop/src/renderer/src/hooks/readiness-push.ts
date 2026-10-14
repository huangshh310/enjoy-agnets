/**
 * main 推来新的 readiness：写进查询缓存；默认路线的密钥校验变了就让设置快照失效（供应商行三态读它）。
 * 不依赖 React，方便单测。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { credentialCheckChanged } from "../lib/credential/key-status.ts"

export type ReadinessPushClient = {
  getQueryData: (key: readonly unknown[]) => unknown
  setQueryData: (key: readonly unknown[], value: ChatReadiness) => unknown
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown
}

export const SETTINGS_QUERY_KEY = ["settings"] as const

export function applyReadinessPush(
  client: ReadinessPushClient,
  key: readonly unknown[],
  next: ChatReadiness
): { refreshedSettings: boolean } {
  const prev = client.getQueryData(key) as ChatReadiness | undefined
  client.setQueryData(key, next)
  if (!credentialCheckChanged(prev, next)) return { refreshedSettings: false }
  void client.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
  return { refreshedSettings: true }
}
