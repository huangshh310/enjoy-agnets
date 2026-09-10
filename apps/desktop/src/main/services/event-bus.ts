/**
 * 给 StreamEvent 打 sequence，推到窗口，并写入回放缓冲。
 */
import { BrowserWindow } from "electron"
import { createEventBuffer, createEventStamper, summarizeReplayEvents } from "@enjoy-agents/agent-core"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { notifyAgentEvent } from "./desktop-notify"

const stampers = new Map<string, ReturnType<typeof createEventStamper>>()
const replayBuffer = createEventBuffer(400)

/** 没有窗口时仍写入回放缓冲，供 Observability / workflow 恢复。 */
export function stampAndBroadcast(event: StreamEvent, sessionId: string): StreamEvent {
  const window = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  if (window) return stampAndSend(window, event, sessionId)
  let stamper = stampers.get(sessionId)
  if (!stamper) {
    stamper = createEventStamper(sessionId)
    stampers.set(sessionId, stamper)
  }
  const stamped = stamper({ ...event, sessionId: event.sessionId ?? sessionId })
  replayBuffer.push(stamped)
  return stamped
}

export function stampAndSend(window: BrowserWindow, event: StreamEvent, sessionId: string): StreamEvent {
  let stamper = stampers.get(sessionId)
  if (!stamper) {
    stamper = createEventStamper(sessionId)
    stampers.set(sessionId, stamper)
  }
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
