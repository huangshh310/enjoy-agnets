/**
 * 右栏打开态：空 = 选项列表；有标签则显示对应工具。
 */
import { create } from "zustand"
import type { RightPaneKind, RightPaneTab } from "@renderer/components/ai-chat/right-pane/right-pane.types"

type RightPaneStore = {
  tabs: RightPaneTab[]
  activeId: string | null
  openTool: (kind: RightPaneKind, options?: { forceNew?: boolean }) => void
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
    const { tabs } = get()
    const existing = options?.forceNew ? undefined : tabs.find((tab) => tab.kind === kind)
    if (existing) {
      set({ activeId: existing.id })
      return
    }
    const tab: RightPaneTab = { id: nextTabId(kind), kind }
    set({ tabs: [...tabs, tab], activeId: tab.id })
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
