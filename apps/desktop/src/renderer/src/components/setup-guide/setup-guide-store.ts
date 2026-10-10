/**
 * 启动引导是否打开。首次启动、设置重开、去添加密钥后回来共用这一份。
 */
import { create } from "zustand"
import type { SetupGuideStep } from "./setup-guide-gate"

export type SetupGuideReason = "first-run" | "replay"

type SetupGuideState = {
  open: boolean
  reason: SetupGuideReason | null
  engaged: boolean
  paused: boolean
  resumeStep: SetupGuideStep | null
  show: (reason: SetupGuideReason) => void
  hide: () => void
  markEngaged: () => void
  pauseAt: (step: SetupGuideStep) => void
  takeResumeStep: () => SetupGuideStep | null
}

export const useSetupGuideStore = create<SetupGuideState>((set, get) => ({
  open: false,
  reason: null,
  engaged: false,
  paused: false,
  resumeStep: null,
  show: (reason) =>
    set({
      open: true,
      reason,
      paused: false,
      engaged: reason === "replay" || Boolean(get().resumeStep)
    }),
  hide: () => set({ open: false, reason: null, engaged: false, paused: false, resumeStep: null }),
  markEngaged: () => set({ engaged: true }),
  pauseAt: (step) => set({ open: false, resumeStep: step, engaged: true, paused: true }),
  takeResumeStep: () => {
    const step = get().resumeStep
    if (step) set({ resumeStep: null })
    return step
  }
}))

export function replaySetupGuide(): void {
  useSetupGuideStore.getState().show("replay")
}

/** 添加密钥后回到向导「连一个模型」步。 */
export function resumeSetupGuide(): void {
  const store = useSetupGuideStore.getState()
  if (!store.resumeStep) {
    useSetupGuideStore.setState({ resumeStep: "connect-model" })
  }
  store.show("replay")
}
