/**
 * E2E / 截图用：桥接 arm 后故意抛一次，用来拍崩溃回退面。
 */
import { create } from "zustand"

type CrashProbeState = {
  armed: boolean
  arm: () => void
}

export const useCrashProbeStore = create<CrashProbeState>((set) => ({
  armed: false,
  arm: () => set({ armed: true })
}))

export function CrashProbe() {
  const armed = useCrashProbeStore((state) => state.armed)
  if (armed) throw new Error("e2e crash probe")
  return null
}
