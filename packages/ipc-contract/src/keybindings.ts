/**
 * 可录制快捷键。用户规则盖住同名命令；缺规则的命令回默认。
 * `mod` 在 macOS 是 ⌘，其它系统是 Ctrl。渲染进程不写盘。
 */
import { z } from "zod"

export const KEYBINDING_COMMANDS = [
  "search.quick",
  "settings.open",
  "nav.back",
  "pane.files",
  "pane.review",
  "pane.terminal",
  "pane.browser",
  "pane.context",
  "pane.desktop",
  "chat.find",
  "chat.permission.cycle",
  "shortcuts.sheet"
] as const

export const KeybindingCommand = z.enum(KEYBINDING_COMMANDS)
export type KeybindingCommand = z.infer<typeof KeybindingCommand>

/** terminalFocus 与 composerFocus 互不重叠，撞键时不算冲突。 */
export const KEYBINDING_WHENS = [
  "settingsOrInbox",
  "!terminalFocus",
  "!inputFocus",
  "terminalFocus",
  "composerFocus"
] as const

export const KeybindingWhen = z.enum(KEYBINDING_WHENS)
export type KeybindingWhen = z.infer<typeof KeybindingWhen>

export const KeybindingRule = z.object({
  key: z.string().min(1).max(64),
  command: KeybindingCommand,
  when: KeybindingWhen.optional()
})
export type KeybindingRule = z.infer<typeof KeybindingRule>

export const KeybindingRuleList = z.array(KeybindingRule).max(256)
export type KeybindingRuleList = z.infer<typeof KeybindingRuleList>

export const KEYBINDING_LIMIT = 256

const WHEN_BY_COMMAND: Partial<Record<KeybindingCommand, KeybindingWhen>> = {
  "nav.back": "settingsOrInbox",
  "chat.find": "!terminalFocus",
  "chat.permission.cycle": "!inputFocus",
  "shortcuts.sheet": "!inputFocus"
}

/** 命令自带的 when。用户规则没写 when 时用这份，设置页不能改 when。 */
export function defaultWhen(command: KeybindingCommand): KeybindingWhen | undefined {
  return WHEN_BY_COMMAND[command]
}

export const DEFAULT_KEYBINDINGS: readonly KeybindingRule[] = [
  { key: "mod+l", command: "search.quick" },
  { key: "mod+k", command: "search.quick" },
  { key: "mod+,", command: "settings.open" },
  { key: "escape", command: "nav.back", when: "settingsOrInbox" },
  { key: "mod+p", command: "pane.files" },
  { key: "mod+shift+g", command: "pane.review" },
  { key: "mod+`", command: "pane.terminal" },
  { key: "mod+t", command: "pane.browser" },
  { key: "mod+shift+c", command: "pane.context" },
  { key: "mod+shift+d", command: "pane.desktop" },
  { key: "mod+f", command: "chat.find", when: "!terminalFocus" },
  { key: "shift+tab", command: "chat.permission.cycle", when: "!inputFocus" },
  { key: "?", command: "shortcuts.sheet", when: "!inputFocus" }
]

const MODIFIER_ORDER = ["mod", "ctrl", "alt", "shift"] as const
const NAMED_KEYS = new Set([
  "escape", "tab", "enter", "space", "backspace", "delete",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
  "home", "end", "pageup", "pagedown",
  "comma", "period", "slash", "backslash", "backquote",
  "minus", "equal", "bracketleft", "bracketright", "semicolon", "quote",
  "?"
])

/** 把 `Mod+Shift+G` 收成 `mod+shift+g`。非法组合返回 null。 */
export function normalizeChord(raw: string): string | null {
  const text = raw.trim().toLowerCase()
  if (text === "unassigned") return "unassigned"
  const parts = text.split("+").map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0 || parts.length > 5) return null
  const mods: string[] = []
  let key = ""
  for (const part of parts) {
    if ((MODIFIER_ORDER as readonly string[]).includes(part)) {
      if (mods.includes(part)) return null
      mods.push(part)
      continue
    }
    if (key || !isKeyToken(part)) return null
    key = part
  }
  if (!key) return null
  mods.sort((a, b) => MODIFIER_ORDER.indexOf(a as (typeof MODIFIER_ORDER)[number]) - MODIFIER_ORDER.indexOf(b as (typeof MODIFIER_ORDER)[number]))
  return [...mods, key].join("+")
}

function isKeyToken(part: string): boolean {
  if (NAMED_KEYS.has(part)) return true
  if (/^f([1-9]|1\d|2[0-4])$/.test(part)) return true
  return part.length === 1 && part !== "+"
}

/** 录制时除 F 键外必须带 mod / alt / ctrl。默认表里的 Esc、? 不走这里。 */
export function chordAllowsRecording(chord: string): boolean {
  const parts = chord.split("+")
  const key = parts[parts.length - 1] ?? ""
  if (/^f([1-9]|1\d|2[0-4])$/.test(key)) return true
  return parts.some((part) => part === "mod" || part === "alt" || part === "ctrl")
}

const RESERVED = new Set(["mod+c", "mod+v", "mod+x", "mod+a", "mod+z", "mod+shift+z", "mod+y"])
const MAC_RESERVED = new Set(["mod+q", "mod+h", "mod+m"])

export type KeybindingPlatform = "mac" | "other"

/** 系统先拿到的键：复制粘贴剪切全选撤销重做，以及 macOS 退出、隐藏、最小化。 */
export function isReservedChord(chord: string, platform: KeybindingPlatform): boolean {
  if (RESERVED.has(chord)) return true
  return platform === "mac" && MAC_RESERVED.has(chord)
}
