/**
 * 给 StreamEvent 打 sequence，推到窗口，并写入回放缓冲。
 */
import { BrowserWindow } from "electron"
import { createEventBuffer, createEventStamper, summarizeReplayEvents } from "@enjoy-agents/agent-core"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { notifyAgentEvent } from "./desktop-notify"

const stampers = new Map<string, ReturnType<typeof createEventStamper>>()
const replayBuffer = createEventBuffer(400)

/** 会话 stamper 上限：超出后按最久未用淘汰，防长进程随会话数无限缓涨。 */
const STAMPER_CAP = 100

function getStamper(sessionId: string) {
  const existing = stampers.get(sessionId)
  if (existing) {
    // Map 按插入序维护；重新插入即视为最近使用（LRU）。
    stampers.delete(sessionId)
    stampers.set(sessionId, existing)
    return existing
  }
  const created = createEventStamper(sessionId)
  stampers.set(sessionId, created)
  while (stampers.size > STAMPER_CAP) {
    const oldest = stampers.keys().next().value
    if (oldest === undefined) break
    stampers.delete(oldest)
  }
  return created
}

/** 没有窗口时仍写入回放缓冲，供 Observability / workflow 恢复。 */
export function stampAndBroadcast(event: StreamEvent, sessionId: string): StreamEvent {
  const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  if (window) return stampAndSend(window, event, sessionId)
  const stamper = getStamper(sessionId)
  const stamped = stamper({ ...event, sessionId: event.sessionId ?? sessionId })
  replayBuffer.push(stamped)
  return stamped
}

export function stampAndSend(window: BrowserWindow, event: StreamEvent, sessionId: string): StreamEvent {
  const stamper = getStamper(sessionId)
  const stamped = stamper({ ...event, sessionId: event.sessionId ?? sessionId })
  replayBuffer.push(stamped)
  notifyAgentEvent(stamped)
  if (!window.isDestroyed()) {
    window.webContents.send("agent.event", stamped)
  }
  return stamped
}

export function listReplayEvents(filter: { sessionId?: string; runId?: string; limit?: number }) {
  return summarizeReplayEvents(replayBuffer.list(filter))
}

export function streamReplay(runId: string) {
  return replayBuffer.stream(runId)
}

/** 给 createBufferedRuntime / 回放共用同一块内存缓冲。 */
export function replayEventBuffer() {
  return replayBuffer
}
