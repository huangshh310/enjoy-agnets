/**
 * 按会话挂纠偏队列。只在安全检查点 drain，不打断正在 execute 的工具。
 */
import type { ModelMessage } from "ai"

export type SteerItem = {
  id: string
  text: string
}

const queues = new Map<string, SteerItem[]>()

export function enqueueSteer(sessionId: string, item: SteerItem): void {
  const current = queues.get(sessionId) ?? []
  queues.set(sessionId, [...current, item])
}

export function drainSteer(sessionId: string): SteerItem[] {
  const items = queues.get(sessionId) ?? []
  queues.delete(sessionId)
  return items
}

export function peekSteerCount(sessionId: string): number {
  return queues.get(sessionId)?.length ?? 0
}

export function clearSteer(sessionId: string): void {
  queues.delete(sessionId)
}

export function steerToModelMessages(items: readonly SteerItem[]): ModelMessage[] {
  return items.map((item) => ({ role: "user", content: item.text }))
}
