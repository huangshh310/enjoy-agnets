/**
 * 本会话最近一次 Enjoy 宿主注入快照。不落库；换引擎后 runtime 对不上则只当能力预览。
 */
import { create } from "zustand"
import type { HostInjectSnapshot } from "@enjoy-agents/ipc-contract"

export type SessionHostInject = HostInjectSnapshot & { runId: string }

type HostInjectStore = {
  bySession: Record<string, SessionHostInject>
  remember: (sessionId: string, snapshot: SessionHostInject) => void
}

export const useHostInjectStore = create<HostInjectStore>((set) => ({
  bySession: {},
  remember: (sessionId, snapshot) =>
    set((state) => ({
      bySession: { ...state.bySession, [sessionId]: snapshot }
    }))
}))

export function hostInjectForSession(sessionId: string | null): SessionHostInject | undefined {
  if (!sessionId) return undefined
  return useHostInjectStore.getState().bySession[sessionId]
}

export function hostInjectForMessage(
  sessionId: string | null,
  messageId: string | undefined
): SessionHostInject | undefined {
  const rec = hostInjectForSession(sessionId)
  if (!rec || !messageId) return undefined
  return messageId === `msg_${rec.runId}` ? rec : undefined
}

export function hostInjectNamesForMessage(
  sessionId: string | null,
  messageId: string | undefined
): { mcp: string[]; skills: string[] } | undefined {
  const rec = hostInjectForMessage(sessionId, messageId)
  if (!rec) return undefined
  if (rec.mcp.injected.length + rec.skills.injected.length === 0) return undefined
  return { mcp: rec.mcp.injected, skills: rec.skills.injected }
}

/** 订阅本轮注入名；无注入或对不上 run 则 undefined。 */
export function useHostInjectNames(sessionId: string | null, messageId: string | undefined) {
  return useHostInjectStore((state) => {
    if (!sessionId || !messageId) return undefined
    const rec = state.bySession[sessionId]
    if (!rec || messageId !== `msg_${rec.runId}`) return undefined
    if (rec.mcp.injected.length + rec.skills.injected.length === 0) return undefined
    return { mcp: rec.mcp.injected, skills: rec.skills.injected }
  })
}
