/**
 * 快捷键目录真源。设置页与 ⌘L 共用 id。
 */

export type ShortcutCategory = "global" | "views" | "chat" | "studio"

export type ShortcutDef = {
  id: string
  actionKey: string
  descKey: string
  keys: string[]
  category: ShortcutCategory
}

export const SHORTCUT_DEFS: ShortcutDef[] = [
  {
    id: "quick-search",
    actionKey: "settings.shortcuts.quickSearch",
    descKey: "settings.shortcuts.quickSearchDesc",
    keys: ["Mod", "L"],
    category: "global"
  },
  {
    id: "quick-search-alt",
    actionKey: "settings.shortcuts.quickSearchAlt",
    descKey: "settings.shortcuts.quickSearchAltDesc",
    keys: ["Mod", "K"],
    category: "global"
  },
  {
    id: "open-settings",
    actionKey: "settings.shortcuts.openSettings",
    descKey: "settings.shortcuts.openSettingsDesc",
    keys: ["Mod", ","],
    category: "global"
  },
  {
    id: "back-workspace",
    actionKey: "settings.shortcuts.backWorkspace",
    descKey: "settings.shortcuts.backWorkspaceDesc",
    keys: ["Esc"],
    category: "global"
  },
  {
    id: "files-tree",
    actionKey: "settings.shortcuts.filesTree",
    descKey: "settings.shortcuts.filesTreeDesc",
    keys: ["Mod", "P"],
    category: "views"
  },
  {
    id: "review-diff",
    actionKey: "settings.shortcuts.reviewDiff",
    descKey: "settings.shortcuts.reviewDiffDesc",
    keys: ["Mod", "Shift", "G"],
    category: "views"
  },
  {
    id: "integrated-terminal",
    actionKey: "settings.shortcuts.terminal",
    descKey: "settings.shortcuts.terminalDesc",
    keys: ["Mod", "`"],
    category: "views"
  },
  {
    id: "in-app-browser",
    actionKey: "settings.shortcuts.browser",
    descKey: "settings.shortcuts.browserDesc",
    keys: ["Mod", "T"],
    category: "views"
  },
  {
    id: "send-message",
    actionKey: "settings.shortcuts.send",
    descKey: "settings.shortcuts.sendDesc",
    keys: ["Enter"],
    category: "chat"
  },
  {
    id: "new-line",
    actionKey: "settings.shortcuts.newLine",
    descKey: "settings.shortcuts.newLineDesc",
    keys: ["Shift", "Enter"],
    category: "chat"
  },
  {
    id: "paste-attachment",
    actionKey: "settings.shortcuts.paste",
    descKey: "settings.shortcuts.pasteDesc",
    keys: ["Mod", "V"],
    category: "chat"
  },
  {
    id: "paste-inline",
    actionKey: "settings.shortcuts.pasteInline",
    descKey: "settings.shortcuts.pasteInlineDesc",
    keys: ["Mod", "Shift", "V"],
    category: "chat"
  },
  {
    id: "recall-prompt",
    actionKey: "settings.shortcuts.recall",
    descKey: "settings.shortcuts.recallDesc",
    keys: ["ArrowUp"],
    category: "chat"
  },
  {
    id: "steer-now",
    actionKey: "settings.shortcuts.steer",
    descKey: "settings.shortcuts.steerDesc",
    keys: ["Mod", "Enter"],
    category: "chat"
  },
  {
    id: "cycle-permission-mode",
    actionKey: "settings.shortcuts.cyclePermission",
    descKey: "settings.shortcuts.cyclePermissionDesc",
    keys: ["Shift", "Tab"],
    category: "chat"
  },
  {
    id: "thread-find",
    actionKey: "settings.shortcuts.threadFind",
    descKey: "settings.shortcuts.threadFindDesc",
    keys: ["Mod", "F"],
    category: "chat"
  }
]
