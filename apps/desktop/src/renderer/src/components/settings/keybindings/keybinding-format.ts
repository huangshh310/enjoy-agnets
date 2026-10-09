/**
 * 把键盘事件收成合约里的 chord，并把 chord 画成按键胶囊。
 */
import { normalizeChord, type KeybindingPlatform } from "@enjoy-agents/ipc-contract"

const CODE_KEYS: Record<string, string> = {
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Space: "space",
  Escape: "escape",
  Tab: "tab",
  Enter: "enter",
  Backspace: "backspace",
  Delete: "delete",
  ArrowUp: "arrowup",
  ArrowDown: "arrowdown",
  ArrowLeft: "arrowleft",
  ArrowRight: "arrowright",
  Home: "home",
  End: "end",
  PageUp: "pageup",
  PageDown: "pagedown"
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}

export function keybindingPlatform(): KeybindingPlatform {
  return isApplePlatform() ? "mac" : "other"
}

/** 忽略单独的修饰键。`?` 不带 ⌘/Ctrl/⌥ 时保持一个问号，不记成 shift+/. */
export function chordFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (event.key === "Meta" || event.key === "Control" || event.key === "Alt" || event.key === "Shift") return null
  const mac = isApplePlatform()
  const command = mac ? event.metaKey : event.ctrlKey || event.metaKey
  if (event.key === "?" && !command && !event.altKey && !event.ctrlKey) return "?"
  const mods: string[] = []
  if (mac) {
    if (event.metaKey) mods.push("mod")
    if (event.ctrlKey) mods.push("ctrl")
  } else if (event.ctrlKey || event.metaKey) {
    mods.push("mod")
  }
  if (event.altKey) mods.push("alt")
  if (event.shiftKey) mods.push("shift")
  const key = keyFromEvent(event)
  if (!key) return null
  return normalizeChord([...mods, key].join("+"))
}

function keyFromEvent(event: KeyboardEvent): string | null {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase()
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5)
  if (/^F([1-9]|1\d|2[0-4])$/.test(event.key)) return event.key.toLowerCase()
  return CODE_KEYS[event.code] ?? (event.key.length === 1 ? event.key.toLowerCase() : null)
}

/** 设置页和快捷键表面板上的按键文字。 */
export function chordGlyphs(chord: string, mac = isApplePlatform()): string[] {
  if (chord === "unassigned") return []
  return chord.split("+").map((part) => glyph(part, mac))
}

function glyph(part: string, mac: boolean): string {
  if (part === "mod") return mac ? "⌘" : "Ctrl"
  if (part === "shift") return mac ? "⇧" : "Shift"
  if (part === "alt" || part === "alt.left" || part === "alt.right") {
    if (!mac) return "Alt"
    if (part === "alt.left") return "⌥L"
    if (part === "alt.right") return "⌥R"
    return "⌥"
  }
  if (part === "ctrl") return mac ? "⌃" : "Ctrl"
  if (part === "escape") return "Esc"
  if (part === "tab") return mac ? "⇥" : "Tab"
  if (part === "enter") return mac ? "⏎" : "Enter"
  if (part === "arrowup") return "↑"
  if (part === "arrowdown") return "↓"
  if (part === "arrowleft") return "←"
  if (part === "arrowright") return "→"
  if (part === "space") return "Space"
  if (part.length === 1) return part.toUpperCase()
  return part
}
