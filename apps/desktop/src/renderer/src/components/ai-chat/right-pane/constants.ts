/**
 * 右栏工具目录：与 Codex 桌面端「先选再开」一致。
 */
import {
  RiCodeBlock,
  RiDashboardLine,
  RiFileList2Line,
  RiGlobalLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { RightPaneKind } from "./right-pane.types"
import type { TranslateFn } from "@renderer/i18n"


export type RightPaneToolDef = {
  kind: RightPaneKind
  label: string
  hint: string
  shortcut: string
  icon: typeof RiCodeBlock
}

const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"

const PANE_TOOL_DEFS = [
  { kind: "context" as const, shortcut: `${MOD}+Shift+C`, icon: RiDashboardLine, label: "chat.paneContext", hint: "chat.paneContextHint" },
  { kind: "review" as const, shortcut: `${MOD}+Shift+G`, icon: RiCodeBlock, label: "chat.paneReview", hint: "chat.paneReviewHint" },
  { kind: "terminal" as const, shortcut: `${MOD}+\``, icon: RiTerminalBoxLine, label: "chat.paneTerminal", hint: "chat.paneTerminalHint" },
  { kind: "browser" as const, shortcut: `${MOD}+T`, icon: RiGlobalLine, label: "chat.paneBrowser", hint: "chat.paneBrowserHint" },
  { kind: "files" as const, shortcut: `${MOD}+P`, icon: RiFileList2Line, label: "chat.paneFiles", hint: "chat.paneFilesHint" }
]

export function getRightPaneTools(t: TranslateFn): RightPaneToolDef[] {
  return PANE_TOOL_DEFS.map((item) => ({
    kind: item.kind,
    shortcut: item.shortcut,
    icon: item.icon,
    label: t(item.label),
    hint: t(item.hint)
  }))
}

export function toolDef(kind: RightPaneKind, t: TranslateFn): RightPaneToolDef {
  const tools = getRightPaneTools(t)
  return tools.find((item) => item.kind === kind) ?? tools[0]!
}

export const PANE_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
