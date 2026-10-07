/**
 * 右栏工具目录：与 Codex 桌面端「先选再开」一致。
 */
import {
  RiCodeBlock,
  RiDashboardLine,
  RiFileList2Line,
  RiGlobalLine,
  RiComputerLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { resolveKeybindings, type KeybindingCommand, type KeybindingRule } from "@enjoy-agents/ipc-contract"
import { chordGlyphs } from "@renderer/components/settings/keybindings/keybinding-format"
import type { RightPaneKind } from "./right-pane.types"
import type { TranslateFn } from "@renderer/i18n"


export type RightPaneToolDef = {
  kind: RightPaneKind
  label: string
  hint: string
  shortcut: string
  icon: typeof RiCodeBlock
}

const PANE_COMMAND: Record<RightPaneKind, KeybindingCommand> = {
  context: "pane.context",
  review: "pane.review",
  terminal: "pane.terminal",
  browser: "pane.browser",
  desktop: "pane.desktop",
  files: "pane.files"
}

const PANE_TOOL_DEFS = [
  { kind: "context" as const, icon: RiDashboardLine, label: "chat.paneContext", hint: "chat.paneContextHint" },
  { kind: "review" as const, icon: RiCodeBlock, label: "chat.paneReview", hint: "chat.paneReviewHint" },
  { kind: "terminal" as const, icon: RiTerminalBoxLine, label: "chat.paneTerminal", hint: "chat.paneTerminalHint" },
  { kind: "browser" as const, icon: RiGlobalLine, label: "chat.paneBrowser", hint: "chat.paneBrowserHint" },
  { kind: "desktop" as const, icon: RiComputerLine, label: "chat.paneDesktop", hint: "chat.paneDesktopHint" },
  { kind: "files" as const, icon: RiFileList2Line, label: "chat.paneFiles", hint: "chat.paneFilesHint" }
]

/** 右栏上的按键提示跟解析结果走，改了设置页这里一起变。 */
export function getRightPaneTools(t: TranslateFn, userRules: readonly KeybindingRule[] = []): RightPaneToolDef[] {
  const resolved = resolveKeybindings(userRules)
  return PANE_TOOL_DEFS.map((item) => ({
    kind: item.kind,
    shortcut: paneChordLabel(resolved, PANE_COMMAND[item.kind]),
    icon: item.icon,
    label: t(item.label),
    hint: t(item.hint)
  }))
}

function paneChordLabel(
  resolved: ReturnType<typeof resolveKeybindings>,
  command: KeybindingCommand
): string {
  const hit = resolved.find((rule) => rule.command === command && rule.key !== "unassigned")
  return hit ? chordGlyphs(hit.key).join("+") : ""
}

export function toolDef(kind: RightPaneKind, t: TranslateFn): RightPaneToolDef {
  const tools = getRightPaneTools(t)
  return tools.find((item) => item.kind === kind) ?? tools[0]!
}

export const PANE_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
