/**
 * 跨会话 Attention 与 Composer 停车。不进 chat-store 标量。
 */
import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import type { AttentionItem, AttentionKind, ParkedRun } from "./attention.types"
import {
  clearActiveCompletes,
  dismissAttentionSlot,
  expireStaleCompletes,
  focusAttentionSlot,
  clearCompleteIfSessionErrored,
  ingestAttentionEvent,
  resolveDecisionSlots,
  clearSessionAttention
} from "./ingest-attention"
import { attachParkedRunId, nextParks } from "./session-run-park"

type AttentionStore = {
  items: AttentionItem[]
  parks: Record<string, ParkedRun>
  runSessions: Record<string, string>
  runKinds: Record<string, string>
  rememberRun: (runId: string, sessionId: string, kind?: string) => void
  sessionOfRun: (runId: string | undefined) => string | undefined
  kindOfRun: (runId: string | undefined) => string | undefined
  ingest: (
    event: StreamEvent,
    sessionId: string,
    sessionTitle: string,
    workspaceId?: string,
    opts?: { omitComplete?: boolean }
  ) => void
  focusSlot: (sessionId: string, kind?: AttentionKind) => void
  dismiss: (id: string) => void
  expireStale: (now?: number) => void
  clearCompletes: () => void
  resolveSessionDecisions: (sessionId: string, runId?: string) => void
  clearCompleteIfErrored: (sessionId: string) => void
  clearSession: (sessionId: string) => void
  putPark: (park: ParkedRun) => void
  takePark: (sessionId: string) => ParkedRun | undefined
  applyParkEvent: (sessionId: string, event: StreamEvent) => void
  claimParkedRun: (sessionId: string, runId: string) => boolean
}

export const useAttentionStore = create<AttentionStore>((set, get) => ({
  items: [],
  parks: {},
  runSessions: {},
  runKinds: {},
  rememberRun: (runId, sessionId, kind) =>
    set((state) => {
      const keys = Object.keys(state.runSessions)
      const evict = keys.length > 500
      const nextSessions = evict
        ? Object.fromEntries(Object.entries(state.runSessions).slice(100))
        : state.runSessions
      const nextKinds = evict
        ? Object.fromEntries(
            Object.entries(state.runKinds).filter(([id]) => nextSessions[id] || id === runId)
          )
        : state.runKinds
      return {
        runSessions: { ...nextSessions, [runId]: sessionId },
        runKinds: kind ? { ...nextKinds, [runId]: kind } : nextKinds
      }
    }),
  sessionOfRun: (runId) => (runId ? get().runSessions[runId] : undefined),
  kindOfRun: (runId) => (runId ? get().runKinds[runId] : undefined),
  ingest: (event, sessionId, sessionTitle, workspaceId, opts) =>
    set((state) => ({
      items: ingestAttentionEvent(state.items, {
        event,
        sessionId,
        sessionTitle,
        workspaceId,
        omitComplete: opts?.omitComplete
      })
    })),
  focusSlot: (sessionId, kind) =>
    set((state) => ({ items: focusAttentionSlot(state.items, sessionId, kind) })),
  dismiss: (id) => set((state) => ({ items: dismissAttentionSlot(state.items, id) })),
  expireStale: (now) =>
    set((state) => ({ items: expireStaleCompletes(state.items, now ?? Date.now()) })),
  clearCompletes: () => set((state) => ({ items: clearActiveCompletes(state.items) })),
  resolveSessionDecisions: (sessionId, runId) =>
    set((state) => ({ items: resolveDecisionSlots(state.items, sessionId, runId) })),
  clearCompleteIfErrored: (sessionId) =>
    set((state) => ({ items: clearCompleteIfSessionErrored(state.items, sessionId) })),
  clearSession: (sessionId) =>
    set((state) => ({ items: clearSessionAttention(state.items, sessionId) })),
  putPark: (park) => set((state) => ({ parks: { ...state.parks, [park.sessionId]: park } })),
  takePark: (sessionId) => {
    const park = get().parks[sessionId]
    if (!park) return undefined
    const { [sessionId]: _removed, ...rest } = get().parks
    set({ parks: rest })
    return park
  },
  applyParkEvent: (sessionId, event) => {
    set((state) => {
      const runId = "runId" in event ? event.runId : undefined
      const rememberedKind = runId ? state.runKinds[runId] : undefined
      const parks = nextParks(state.parks, sessionId, event, rememberedKind)
      return parks ? { parks } : state
    })
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
