/**
 * 可录制命令的文案和分组。发送、换行、粘贴不在这张表里。
 */
import type { KeybindingCommand } from "@enjoy-agents/ipc-contract"

export type KeybindingCategory = "global" | "views" | "chat"

export type KeybindingCommandMeta = {
  command: KeybindingCommand
  actionKey: string
  descKey: string
  category: KeybindingCategory
}

export const KEYBINDING_CATALOG: readonly KeybindingCommandMeta[] = [
  { command: "search.quick", actionKey: "settings.shortcuts.quickSearch", descKey: "settings.shortcuts.quickSearchDesc", category: "global" },
  { command: "settings.open", actionKey: "settings.shortcuts.openSettings", descKey: "settings.shortcuts.openSettingsDesc", category: "global" },
  { command: "nav.back", actionKey: "settings.shortcuts.backWorkspace", descKey: "settings.shortcuts.backWorkspaceDesc", category: "global" },
  { command: "pane.files", actionKey: "settings.shortcuts.filesTree", descKey: "settings.shortcuts.filesTreeDesc", category: "views" },
  { command: "pane.review", actionKey: "settings.shortcuts.reviewDiff", descKey: "settings.shortcuts.reviewDiffDesc", category: "views" },
  { command: "pane.terminal", actionKey: "settings.shortcuts.terminal", descKey: "settings.shortcuts.terminalDesc", category: "views" },
  { command: "pane.browser", actionKey: "settings.shortcuts.browser", descKey: "settings.shortcuts.browserDesc", category: "views" },
  { command: "pane.context", actionKey: "settings.shortcuts.context", descKey: "settings.shortcuts.contextDesc", category: "views" },
  { command: "pane.desktop", actionKey: "settings.shortcuts.desktop", descKey: "settings.shortcuts.desktopDesc", category: "views" },
  { command: "chat.find", actionKey: "settings.shortcuts.threadFind", descKey: "settings.shortcuts.threadFindDesc", category: "chat" },
  { command: "chat.permission.cycle", actionKey: "settings.shortcuts.cyclePermission", descKey: "settings.shortcuts.cyclePermissionDesc", category: "chat" },
  { command: "shortcuts.sheet", actionKey: "settings.shortcuts.shortcutSheet", descKey: "settings.shortcuts.shortcutSheetDesc", category: "chat" }
]

export function metaFor(command: KeybindingCommand): KeybindingCommandMeta {
  const found = KEYBINDING_CATALOG.find((item) => item.command === command)
  if (!found) throw new Error(`missing keybinding meta: ${command}`)
  return found
}

/** ⌘L 是快速搜索，⌘K 是命令面板。两者打开同一窗口，设置页与快捷键表必须分名。 */
export function labelKeysForBinding(
  command: KeybindingCommand,
  chord: string
): { actionKey: string; descKey: string } {
  const meta = metaFor(command)
  if (command === "search.quick" && isCommandPaletteChord(chord)) {
    return {
      actionKey: "settings.shortcuts.quickSearchAlt",
      descKey: "settings.shortcuts.quickSearchAltDesc"
    }
  }
  return { actionKey: meta.actionKey, descKey: meta.descKey }
}

function isCommandPaletteChord(chord: string): boolean {
  return chord === "mod+k" || chord === "ctrl+k"
}
