/**
 * 右栏工具目录：与 Codex 桌面端「先选再开」一致。
 */
import {
  RiCodeBlock,
  RiFileList2Line,
  RiGlobalLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { RightPaneKind } from "./right-pane.types"

export type RightPaneToolDef = {
  kind: RightPaneKind
  label: string
  hint: string
  shortcut: string
  icon: typeof RiCodeBlock
}

export const RIGHT_PANE_TOOLS: RightPaneToolDef[] = [
  {
    kind: "review",
    label: "Review",
    hint: "Uncommitted diff and file hunks",
    shortcut: "Ctrl+Shift+G",
    icon: RiCodeBlock
  },
  {
    kind: "terminal",
    label: "Terminal",
    hint: "Workspace shell",
    shortcut: "Ctrl+`",
    icon: RiTerminalBoxLine
  },
  {
    kind: "browser",
    label: "Browser",
    hint: "Preview the running page",
    shortcut: "Ctrl+T",
    icon: RiGlobalLine
  },
  {
    kind: "files",
    label: "Files",
    hint: "Workspace tree and file preview",
    shortcut: "Ctrl+P",
    icon: RiFileList2Line
  }
]

export function toolDef(kind: RightPaneKind): RightPaneToolDef {
  return RIGHT_PANE_TOOLS.find((item) => item.kind === kind) ?? RIGHT_PANE_TOOLS[0]!
}

export const PANE_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
