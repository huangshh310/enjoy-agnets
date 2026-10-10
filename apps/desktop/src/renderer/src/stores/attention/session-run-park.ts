/**
 * 切会话时停车 / 还原 Composer run 字段，不 abort 后台轮。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isUserAbortEvent } from "@enjoy-agents/ipc-contract/desktop-notify"
import type { ChatStore } from "../chat-store.types"
import type { ParkedRun } from "./attention.types"

export function captureParkedRun(store: {
  sessionId: string | null
  runId: string | null
  running: boolean
  runStartedAt: number | null
  pendingApproval: ChatStore["pendingApproval"]
  error: string | null
  thinkingLabel: string
  pendingStreamEvents: StreamEvent[]
}): ParkedRun | null {
  if (!store.sessionId) return null
  if (!store.running && !store.pendingApproval && !store.error && !store.runId) return null
  return {
    sessionId: store.sessionId,
    runId: store.runId,
    running: store.running,
    runStartedAt: store.runStartedAt,
    pendingApproval: store.pendingApproval,
    error: store.error,
    thinkingLabel: store.thinkingLabel,
    pendingStreamEvents: store.pendingStreamEvents
  }
}

export function seedParkFromRunStart(sessionId: string, runId: string, now = Date.now()): ParkedRun {
  return {
    sessionId,
    runId,
    running: true,
    runStartedAt: now,
    pendingApproval: null,
    error: null,
    thinkingLabel: "Thinking",
    pendingStreamEvents: []
  }
}

/** 没有 park 时只认 run.start。其它事件保持原表。 */
export function nextParks(
  parks: Record<string, ParkedRun>,
  sessionId: string,
  event: StreamEvent
): Record<string, ParkedRun> | null {
  const existing = parks[sessionId]
  if (!existing) {
    if (event.type !== "run.start") return null
    return { ...parks, [sessionId]: seedParkFromRunStart(sessionId, event.runId) }
  }
  return { ...parks, [sessionId]: applyEventToPark(existing, event) }
}

export function applyEventToPark(park: ParkedRun, event: StreamEvent): ParkedRun {
  if (event.type === "run.start") {
    return { ...park, runId: event.runId, running: true }
  }
  if (event.type === "approval.required") {
    return { ...park, pendingApproval: event, running: true, runId: event.runId }
  }
  if (event.type === "approval.resolved") {
    return { ...park, pendingApproval: null }
  }
  if (event.type === "run.end") {
    return { ...park, running: false, runId: null, pendingApproval: null }
  }
  if (event.type === "run.error") {
    if (isUserAbortEvent(event)) {
      return { ...park, running: false, error: null, pendingApproval: null }
    }
    return { ...park, running: false, error: event.message, pendingApproval: null }
  }
  return park
}

export function attachParkedRunId(park: ParkedRun, runId: string): ParkedRun {
  return { ...park, runId, running: true }
}

export function idleComposerPatch(): Pick<
  ChatStore,
  | "running"
  | "runId"
  | "runStartedAt"
  | "pendingApproval"
  | "error"
  | "pendingStreamEvents"
  | "thinkingLabel"
> {
  return {
    running: false,
    runId: null,
    runStartedAt: null,
    pendingApproval: null,
    error: null,
    pendingStreamEvents: [],
    thinkingLabel: "Thinking"
  }
}

export function parkedComposerPatch(park: ParkedRun): ReturnType<typeof idleComposerPatch> {
  return {
    running: park.running,
    runId: park.runId,
    runStartedAt: park.runStartedAt,
    pendingApproval: park.pendingApproval,
    error: park.error,
    pendingStreamEvents: park.pendingStreamEvents,
    thinkingLabel: park.thinkingLabel
  }
}
