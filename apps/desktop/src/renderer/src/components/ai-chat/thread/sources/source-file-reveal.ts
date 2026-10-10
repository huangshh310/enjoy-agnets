/**
 * 打开来源文件后滚到行。不塞进 chat-store，避免审查选文件被行号拖累。
 */
import { create } from "zustand"

import type { SourceOpenView } from "./source-row-action.ts"

type Reveal = { path: string; line: number; endLine?: number; view: SourceOpenView } | null

type SourceFileRevealState = {
  reveal: Reveal
  setReveal: (reveal: Reveal) => void
}

export const useSourceFileReveal = create<SourceFileRevealState>((set) => ({
  reveal: null,
  setReveal: (reveal) => set({ reveal })
}))
