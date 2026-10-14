/**
 * 首字前「连不上供应商」红卡里的供应商名。
 * 注意：apiKeys[].providerId 存的是 vault 档案 id（= defaultRoute.profileId），不是预设 kind；
 * 预设 kind 在 presetId。路线指了档案却在 apiKeys 里找不到时不能拿别家档案顶名（leo soft）。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

type Snap = Pick<ChatReadiness, "defaultRoute" | "engines" | "apiKeys">

export function unreachableProviderName(snap: Snap | undefined, fallback: string): string {
  const route = snap?.defaultRoute
  if (route?.runtimeId && route.runtimeId !== "enjoy-local") {
    const name = snap?.engines.find((row) => row.runtimeId === route.runtimeId)?.name
    if (name) return name
  }
  const profileId = route?.profileId
  const key = profileId
    ? snap?.apiKeys.find((row) => row.providerId === profileId)
    : snap?.apiKeys[0]
  return key?.presetId || fallback
}
