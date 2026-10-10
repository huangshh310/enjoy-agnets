/**
 * 右栏命令：键由调度器决定，这里只负责展开对应面板。
 */
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { revealRightPane } from "./open-pane"
import type { RightPaneKind } from "./right-pane.types"

export function useRightPaneShortcuts(enabled = true) {
  const open = (kind: RightPaneKind) => () => {
    if (!enabled) return false
    revealRightPane(kind)
    return true
  }
  useKeybindingCommand("pane.context", open("context"))
  useKeybindingCommand("pane.review", open("review"))
  useKeybindingCommand("pane.desktop", open("desktop"))
  useKeybindingCommand("pane.terminal", open("terminal"))
  useKeybindingCommand("pane.browser", open("browser"))
  useKeybindingCommand("pane.files", open("files"))
}
