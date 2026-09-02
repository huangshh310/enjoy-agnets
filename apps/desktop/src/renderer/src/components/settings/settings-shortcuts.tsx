/**
 * Settings → Keyboard shortcuts：全景键盘快捷键中心。
 * 按全局导航、开发视图、会话输入与智能体中枢多维度分组，支持快捷键搜索与多平台符号自适应。
 */
import { useMemo, useState } from "react"
import {
  RiInformationLine,
  RiKeyboardBoxLine,
  RiSearchLine
} from "@remixicon/react"
import { SettingsCard, SettingsRow } from "./settings-row"

export interface ShortcutItem {
  id: string
  action: string
  desc: string
  keys: string[]
  category: "global" | "views" | "chat" | "studio"
}

const SHORTCUT_REGISTRY: ShortcutItem[] = [
  // ─── 全局导航与指令 ────────────────────────────────
  {
    id: "quick-search",
    action: "Quick Search & Command Palette",
    desc: "Open the unified command palette to jump to tools, settings, or recent sessions.",
    keys: ["Mod", "L"],
    category: "global"
  },
  {
    id: "quick-search-alt",
    action: "Quick Search (Alternative)",
    desc: "Secondary standard hotkey for the quick command dialog.",
    keys: ["Mod", "K"],
    category: "global"
  },
  {
    id: "open-settings",
    action: "Open Settings",
    desc: "Navigate to the General settings page from anywhere in the app.",
    keys: ["Mod", ","],
    category: "global"
  },
  {
    id: "back-workspace",
    action: "Back to Workspace / Close",
    desc: "Return to the main agent workspace or dismiss active secondary modals.",
    keys: ["Esc"],
    category: "global"
  },

  // ─── 右侧栏开发视图 ────────────────────────────────
  {
    id: "files-tree",
    action: "Files & Code Preview",
    desc: "Open the workspace file tree and code inspector in the right pane.",
    keys: ["Mod", "P"],
    category: "views"
  },
  {
    id: "review-diff",
    action: "Review & Git Diff",
    desc: "Open the Changes pane to inspect file modifications and review diffs.",
    keys: ["Mod", "Shift", "G"],
    category: "views"
  },
  {
    id: "integrated-terminal",
    action: "Integrated Terminal",
    desc: "Toggle the workspace-jailed PTY terminal shell.",
    keys: ["Mod", "`"],
    category: "views"
  },
  {
    id: "in-app-browser",
    action: "In-App Browser Preview",
    desc: "Open the live web application preview surface.",
    keys: ["Mod", "T"],
    category: "views"
  },

  // ─── 聊天与输入框交互 ──────────────────────────────
  {
    id: "send-message",
    action: "Send Message / Run Agent",
    desc: "Submit the prompt and start the agent execution loop.",
    keys: ["Enter"],
    category: "chat"
  },
  {
    id: "new-line",
    action: "New Line in Composer",
    desc: "Insert a line break inside the chat input textarea without sending.",
    keys: ["Shift", "Enter"],
    category: "chat"
  },
  {
    id: "paste-attachment",
    action: "Paste Image or Files",
    desc: "Paste clipboard screenshots or files directly into the attachment queue.",
    keys: ["Mod", "V"],
    category: "chat"
  }
]

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}

function shortcutGlyph(key: string): string {
  const isMac = isApplePlatform()
  if (key === "Mod") return isMac ? "⌘" : "Ctrl"
  if (key === "Shift") return isMac ? "⇧" : "Shift"
  if (key === "Alt") return isMac ? "⌥" : "Alt"
  if (key === "Enter") return isMac ? "⏎" : "Enter"
  return key
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center justify-end gap-1.5 min-w-[160px] shrink-0">
      {keys.map((key, index) => (
        <span key={`${key}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && (
            <span className="text-[11px] font-semibold text-text-tertiary select-none" aria-hidden>
              +
            </span>
          )}
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default px-2 font-mono text-[11px] font-semibold text-text-primary shadow-2xs select-none">
            {shortcutGlyph(key)}
          </kbd>
        </span>
      ))}
    </div>
  )
}

export function ShortcutSettings() {
  const [search, setSearch] = useState("")
  const isMac = isApplePlatform()

  const filteredShortcuts = useMemo(() => {
    if (!search.trim()) return SHORTCUT_REGISTRY
    const q = search.toLowerCase().trim()
    return SHORTCUT_REGISTRY.filter(
      (item) =>
        item.action.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
    )
  }, [search])

  const globalItems = filteredShortcuts.filter((item) => item.category === "global")
  const viewItems = filteredShortcuts.filter((item) => item.category === "views")
  const chatItems = filteredShortcuts.filter((item) => item.category === "chat")

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 快捷键看板与平台提示 ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
              <RiKeyboardBoxLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  Keyboard Shortcuts Directory
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  {isMac ? "macOS Layout (⌘)" : "Windows / Linux (Ctrl)"}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                Speed up your workflow with global command palette, pane toggles, and chat shortcuts.
              </span>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pl-8 pr-2.5 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
            />
          </div>
        </div>
      </div>

      {/* ─── 分组快捷键列表 ─────────────────────────────── */}
      {globalItems.length > 0 && (
        <SettingsCard title="Global & Navigation">
          {globalItems.map((item) => (
            <SettingsRow key={item.id} title={item.action} description={item.desc}>
              <ShortcutKeys keys={item.keys} />
            </SettingsRow>
          ))}
        </SettingsCard>
      )}

      {viewItems.length > 0 && (
        <SettingsCard title="Right Stage & Development Panes">
          {viewItems.map((item) => (
            <SettingsRow key={item.id} title={item.action} description={item.desc}>
              <ShortcutKeys keys={item.keys} />
            </SettingsRow>
          ))}
        </SettingsCard>
      )}

      {chatItems.length > 0 && (
        <SettingsCard title="Chat & Composer Operations">
          {chatItems.map((item) => (
            <SettingsRow key={item.id} title={item.action} description={item.desc}>
              <ShortcutKeys keys={item.keys} />
            </SettingsRow>
          ))}
        </SettingsCard>
      )}

      {filteredShortcuts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-border-button-default bg-background-primary-default shadow-card">
          <div className="flex size-10 items-center justify-center rounded-full bg-background-secondary-default text-text-tertiary mb-2">
            <RiInformationLine className="size-5" />
          </div>
          <p className="text-caption-1-medium text-text-primary">No shortcuts found</p>
          <p className="text-caption-2-regular text-text-tertiary mt-0.5">
            Try a different search keyword (e.g. terminal, files, git, search).
          </p>
        </div>
      )}
    </div>
  )
}
