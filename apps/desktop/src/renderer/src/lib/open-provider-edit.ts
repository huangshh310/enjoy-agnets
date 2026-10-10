/**
 * 打开某一档案的编辑抽屉，焦点落在密钥框。不要只跳供应商列表。
 * 深链 id 对不上时落到正在用的有钥档案，避免夹具 snapshot 的 e2e 对不上 prv_*。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { resolveDefaultProviderId, type ListedProvider } from "./default-provider-label"

export const PROVIDER_EDIT_FOCUS_KEY = "key"

export function providerEditSearch(id: string, from?: string): { edit: string; focus: string; from?: string } {
  return from ? { edit: id, focus: PROVIDER_EDIT_FOCUS_KEY, from } : { edit: id, focus: PROVIDER_EDIT_FOCUS_KEY }
}

export function findProviderForEdit<T extends ListedProvider>(
  providers: readonly T[],
  editId: string | undefined,
  readiness?: ChatReadiness
): T | undefined {
  if (!editId || providers.length === 0) return undefined
  return (
    providers.find((row) => row.id === editId) ??
    providers.find((row) => row.id === resolveDefaultProviderId(readiness, providers))
  )
}
