/**
 * 会话表 ↔ 活跃 run 副本。toggle / 撤销 / 清空后立刻 overlay。
 */
import { overlayConversationDesktopAllow } from "@enjoy-agents/agent-core"
import { listActiveRuns } from "./agent-run-state"

export function syncActiveRunsDesktopAllow(sessionId: string): void {
  const sid = sessionId.trim()
  if (!sid) return
  for (const { run } of listActiveRuns()) {
    if (run.input.sessionId !== sid) continue
    overlayConversationDesktopAllow(sid, run.sessionApprovedTools)
  }
}
