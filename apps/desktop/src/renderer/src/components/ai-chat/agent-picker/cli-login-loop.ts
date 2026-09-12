/**
 * 引擎级登录闭环：打开授权中 ≠ 已登录。设置表、Picker、发送闸共用。
 */
import { create } from "zustand"
import type { OfficialLoginLoop } from "@enjoy-agents/ipc-contract"

export type CliLoginLoopSnap = {
  phase: OfficialLoginLoop
  reason: string
}

const IDLE: CliLoginLoopSnap = { phase: "idle", reason: "" }

type CliLoginLoopStore = {
  byId: Record<string, CliLoginLoopSnap>
  begin: (id: string) => void
  succeed: (id: string) => void
  fail: (id: string, reason: string) => void
  reset: () => void
}

export const useCliLoginLoopStore = create<CliLoginLoopStore>((set) => ({
  byId: {},
  begin: (id) =>
    set((state) => ({
      byId: { ...state.byId, [id]: { phase: "authorizing", reason: "" } }
    })),
  succeed: (id) =>
    set((state) => {
      const next = { ...state.byId }
      delete next[id]
      return { byId: next }
    }),
  fail: (id, reason) =>
    set((state) => ({
      byId: { ...state.byId, [id]: { phase: "failed", reason } }
    })),
  reset: () => set({ byId: {} })
}))

export function getCliLoginLoop(id: string): CliLoginLoopSnap {
  return useCliLoginLoopStore.getState().byId[id] ?? IDLE
}

export function useCliLoginLoop(id: string): CliLoginLoopSnap {
  return useCliLoginLoopStore((state) => state.byId[id] ?? IDLE)
}

export function resetCliLoginLoopStore(): void {
  useCliLoginLoopStore.getState().reset()
}
