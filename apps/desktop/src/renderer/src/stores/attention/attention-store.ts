/**
 * 跨会话 Attention 与 Composer 停车。不进 chat-store 标量。
 */
import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import type { AttentionItem, AttentionKind, ParkedRun } from "./attention.types"
import {
  dismissAttentionSlot,
  expireStaleCompletes,
  focusAttentionSlot,
  ingestAttentionEvent,
  resolveDecisionSlots
} from "./ingest-attention"
import { applyEventToPark, attachParkedRunId } from "./session-run-park"

type AttentionStore = {
  items: AttentionItem[]
  parks: Record<string, ParkedRun>
  runSessions: Record<string, string>
  rememberRun: (runId: string, sessionId: string) => void
  sessionOfRun: (runId: string | undefined) => string | undefined
  ingest: (
    event: StreamEvent,
    sessionId: string,
    sessionTitle: string,
    workspaceId?: string
  ) => void
  focusSlot: (sessionId: string, kind?: AttentionKind) => void
  dismiss: (id: string) => void
  expireStale: (now?: number) => void
  resolveSessionDecisions: (sessionId: string, runId?: string) => void
  putPark: (park: ParkedRun) => void
  takePark: (sessionId: string) => ParkedRun | undefined
  applyParkEvent: (sessionId: string, event: StreamEvent) => void
  claimParkedRun: (sessionId: string, runId: string) => boolean
}

export const useAttentionStore = create<AttentionStore>((set, get) => ({
  items: [],
  parks: {},
  runSessions: {},
  rememberRun: (runId, sessionId) =>
    set((state) => ({ runSessions: { ...state.runSessions, [runId]: sessionId } })),
  sessionOfRun: (runId) => (runId ? get().runSessions[runId] : undefined),
  ingest: (event, sessionId, sessionTitle, workspaceId) =>
    set((state) => ({
      items: ingestAttentionEvent(state.items, { event, sessionId, sessionTitle, workspaceId })
    })),
  focusSlot: (sessionId, kind) =>
    set((state) => ({ items: focusAttentionSlot(state.items, sessionId, kind) })),
  dismiss: (id) => set((state) => ({ items: dismissAttentionSlot(state.items, id) })),
  expireStale: (now) =>
    set((state) => ({ items: expireStaleCompletes(state.items, now ?? Date.now()) })),
  resolveSessionDecisions: (sessionId, runId) =>
    set((state) => ({ items: resolveDecisionSlots(state.items, sessionId, runId) })),
  putPark: (park) => set((state) => ({ parks: { ...state.parks, [park.sessionId]: park } })),
  takePark: (sessionId) => {
    const park = get().parks[sessionId]
    if (!park) return undefined
    const { [sessionId]: _removed, ...rest } = get().parks
    set({ parks: rest })
    return park
  },
  applyParkEvent: (sessionId, event) => {
    const existing = get().parks[sessionId]
    if (!existing) return
    set((state) => ({
      parks: { ...state.parks, [sessionId]: applyEventToPark(existing, event) }
    }))
  },
  claimParkedRun: (sessionId, runId) => {
    const existing = get().parks[sessionId]
    if (!existing) return false
    set((state) => ({
      parks: { ...state.parks, [sessionId]: attachParkedRunId(existing, runId) },
      runSessions: { ...state.runSessions, [runId]: sessionId }
    }))
    return true
  }
}))
