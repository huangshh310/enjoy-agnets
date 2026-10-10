/**
 * 无项目时点「新对话」：点亮「选择文件夹」，不要假装开了会话。
 */
import { create } from "zustand"

export const useNoProjectNudge = create<{
  on: boolean
  pulse: () => void
  clear: () => void
}>((set) => ({
  on: false,
  pulse: () => set({ on: true }),
  clear: () => set({ on: false })
}))
