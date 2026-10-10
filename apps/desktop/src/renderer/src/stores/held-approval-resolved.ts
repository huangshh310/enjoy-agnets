/**
 * 切回会话时消息还空，approval.resolved 先挂住，回灌后再折，避免转圈被迟到的库行盖住。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

type HeldResolved = { sessionId: string; event: StreamEvent }

let held: HeldResolved[] = []

export function holdApprovalResolved(sessionId: string, event: StreamEvent) {
  held.push({ sessionId, event })
}

export function takeHeldApprovalResolved(sessionId: string): StreamEvent[] {
  const next = held.filter((row) => row.sessionId === sessionId).map((row) => row.event)
  held = held.filter((row) => row.sessionId !== sessionId)
  return next
}

export function clearHeldApprovalResolved() {
  held = []
}
