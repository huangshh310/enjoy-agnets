/**
 * 审批会话工具集：会话表 ∪ 本轮副本，补跑再丢掉 desktop_act:*。
 */
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  mergeConversationDesktopAllow,
  stripAnyDesktopSessionAllow
} from "@enjoy-agents/agent-core/computer-use"

export function approvalSessionTools(
  sessionId: string,
  runCopy: ReadonlySet<string>,
  denyAnyDesktop?: boolean
): { sessionApprovedTools: Set<string>; anyDesktopSession: boolean } {
  const merged = mergeConversationDesktopAllow(sessionId, runCopy)
  const sessionApprovedTools = denyAnyDesktop ? stripAnyDesktopSessionAllow(merged) : merged
  return {
    sessionApprovedTools,
    anyDesktopSession: !denyAnyDesktop && sessionApprovedTools.has(DESKTOP_ACT_ANY_SESSION_KEY)
  }
}
