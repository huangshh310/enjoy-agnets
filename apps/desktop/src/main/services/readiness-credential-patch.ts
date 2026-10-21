/**
 * jojo #169 P3：一次发送回写了某份档案的校验态后，先在缓存快照上改这一项立刻推，不等整张重算。
 * 快照的 credentialCheck 是「默认路线那份档案」的（没有 defaultRoute.profileId 时是当前档案的，
 * 见 buildChatReadiness 的 pickedCheck）；只有这一轮用的就是那份档案才改，别的档案不碰。
 * 被拒（invalid）且默认路线是 Enjoy 本地 → ready 也跟着落 false（ready ⇒ 闸放行，见 chat-route-pick）。
 * 其它变化（ok / unverified）只改校验态，ready 留给随后的整张重算。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"

export function readinessWithCredentialCheck(
  snapshot: ChatReadiness,
  profileId: string,
  check: CredentialCheck
): ChatReadiness {
  const routeProfile = snapshot.defaultRoute?.profileId
  if (routeProfile && routeProfile !== profileId) return snapshot
  if (!routeProfile && !snapshot.apiKeys.some((row) => row.providerId === profileId)) return snapshot
  const invalid = check.state === "invalid"
  const enjoyLocal = (snapshot.defaultRoute?.runtimeId ?? "enjoy-local") === "enjoy-local"
  return {
    ...snapshot,
    credentialCheck: check,
    ...(invalid && enjoyLocal ? { ready: false } : {})
  }
}
