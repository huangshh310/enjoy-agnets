/**
 * 右栏命令：键由调度器决定，这里只负责展开对应面板。
 */
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { revealRightPane } from "./open-pane"
import type { RightPaneKind } from "./right-pane.types"

export function useRightPaneShortcuts() {
  useKeybindingCommand("pane.context", () => openPane("context"))
  useKeybindingCommand("pane.review", () => openPane("review"))
  useKeybindingCommand("pane.desktop", () => openPane("desktop"))
  useKeybindingCommand("pane.terminal", () => openPane("terminal"))
  useKeybindingCommand("pane.browser", () => openPane("browser"))
  useKeybindingCommand("pane.files", () => openPane("files"))
}

function openPane(kind: RightPaneKind): boolean {
  revealRightPane(kind)
  return true
}
