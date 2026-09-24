/**
 * 启动引导是否打开。首次启动和设置里的「再看一遍」共用这一份。
 */
import { create } from "zustand"

export type SetupGuideReason = "first-run" | "replay"

type SetupGuideState = {
  open: boolean
  reason: SetupGuideReason | null
  engaged: boolean
  show: (reason: SetupGuideReason) => void
  hide: () => void
  markEngaged: () => void
}

export const useSetupGuideStore = create<SetupGuideState>((set) => ({
  open: false,
  reason: null,
  engaged: false,
  show: (reason) => set({ open: true, reason, engaged: reason === "replay" }),
  hide: () => set({ open: false, reason: null, engaged: false }),
  markEngaged: () => set({ engaged: true })
}))

export function replaySetupGuide(): void {
  useSetupGuideStore.getState().show("replay")
}
