/**
 * 用户点停止的那几轮（按会话记 runId）。abort IPC 是异步的：main 收到前，那一轮还可能再发事件，
 * 最要命的是迟到的 approval.required——会把审批卡重新挂出来、running 又被置上（#160 巡检第 6 项：
 * 停掉「很慢」那一轮后写入审批卡还在）。
 *
 * 规则：被停的 run 之后的事件一律丢掉，只放行终态和落库类事件（run.end / run.error / message.persisted /
 * usage.updated），让落库 id、用量、Attention 终态照常对齐；这些事件在 running 已落下时本来就不会把这一轮「复活」。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

const MAX_PER_SESSION = 8
const bySession = new Map<string, string[]>()

const PASS_THROUGH = new Set<StreamEvent["type"]>(["run.end", "run.error", "message.persisted", "usage.updated"])

export function rememberStoppedRun(sessionId: string | null | undefined, runId: string | null | undefined): void {
  if (!sessionId || !runId) return
  const list = bySession.get(sessionId) ?? []
  if (list.includes(runId)) return
  list.push(runId)
  if (list.length > MAX_PER_SESSION) list.shift()
  bySession.set(sessionId, list)
}

export function isStoppedRun(runId: string | null | undefined, sessionId?: string | null): boolean {
  if (!runId) return false
  if (sessionId) return bySession.get(sessionId)?.includes(runId) ?? false
  for (const list of bySession.values()) if (list.includes(runId)) return true
  return false
}

/** 这条事件属于用户已停掉的那一轮，且不是终态 / 落库类：丢掉。 */
export function isLateEventOfStoppedRun(event: StreamEvent): boolean {
  if (PASS_THROUGH.has(event.type)) return false
  const runId = "runId" in event && typeof event.runId === "string" ? event.runId : undefined
  return isStoppedRun(runId)
}

export function resetStoppedRunsForTest(): void {
  bySession.clear()
}
