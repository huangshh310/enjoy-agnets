/**
 * 会话表 ↔ 活跃 run 副本。toggle / 撤销 / 清空后立刻 overlay。
 */
import {
  overlayConversationDesktopAllow,
  revokeConversationDesktopAllow
} from "@enjoy-agents/agent-core"
import { listActiveRuns } from "./agent-run-state"

export function syncActiveRunsDesktopAllow(sessionId: string): void {
  const sid = sessionId.trim()
  if (!sid) return
  for (const { run } of listActiveRuns()) {
    if (run.input.sessionId !== sid) continue
    overlayConversationDesktopAllow(sid, run.sessionApprovedTools)
  }
}

/** 人手撤销某个应用 Allow，立刻从会话表和该会话的活跃 run 摘掉。 */
export function revokeActiveDesktopAllow(sessionId: string, key: string): void {
  revokeConversationDesktopAllow(sessionId, key)
  syncActiveRunsDesktopAllow(sessionId)
}
