/**
 * 右栏命令：键由调度器决定。审查是开/关，其它只展开。
 */
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { revealRightPane } from "./open-pane"
import { reviewShortcutAction } from "./review-shortcut-action"
import type { RightPaneKind } from "./right-pane.types"

export function useRightPaneShortcuts(enabled = true) {
  const open = (kind: RightPaneKind) => () => {
    if (!enabled) return false
    revealRightPane(kind)
    return true
  }
  useKeybindingCommand("pane.context", open("context"))
  useKeybindingCommand("pane.review", () => {
    if (!enabled) return false
    const collapsed = useChatStore.getState().rightPanelCollapsed
    const pane = useRightPaneStore.getState()
    const activeKind = pane.tabs.find((tab) => tab.id === pane.activeId)?.kind
    if (reviewShortcutAction({ collapsed, activeKind }) === "close") {
      useChatStore.getState().setRightPanelCollapsed(true)
      return true
    }
    revealRightPane("review")
    return true
  })
  useKeybindingCommand("pane.desktop", open("desktop"))
  useKeybindingCommand("pane.terminal", open("terminal"))
  useKeybindingCommand("pane.browser", open("browser"))
  useKeybindingCommand("pane.files", open("files"))
}
