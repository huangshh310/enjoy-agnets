/**
 * 右栏打开态：空 = 选项列表；有标签则显示对应工具。
 */
import { create } from "zustand"
import type { RightPaneKind, RightPaneTab } from "@renderer/components/ai-chat/right-pane/right-pane.types"
import { openToolState } from "@renderer/components/ai-chat/right-pane/open-tool-state"

type RightPaneStore = {
  tabs: RightPaneTab[]
  activeId: string | null
  openTool: (kind: RightPaneKind, options?: { forceNew?: boolean; url?: string }) => void
  closeTab: (id: string) => void
  setActiveId: (id: string) => void
  reset: () => void
}

function nextTabId(kind: RightPaneKind): string {
  return `${kind}-${crypto.randomUUID()}`
}

export const useRightPaneStore = create<RightPaneStore>((set, get) => ({
  tabs: [],
  activeId: null,
  openTool: (kind, options) => {
    set(openToolState(get().tabs, kind, options, nextTabId(kind)))
  },
  closeTab: (id) => {
    const tabs = get().tabs.filter((tab) => tab.id !== id)
    const activeId = get().activeId
    const nextActive = activeId === id ? (tabs.at(-1)?.id ?? null) : activeId
    set({ tabs, activeId: nextActive })
  },
  setActiveId: (activeId) => set({ activeId }),
  reset: () => set({ tabs: [], activeId: null })
}))
