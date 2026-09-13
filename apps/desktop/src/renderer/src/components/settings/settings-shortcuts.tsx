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
import { useT, type TranslateFn } from "@renderer/i18n"
import { SettingsCard, SettingsRow } from "./settings-row"

export interface ShortcutItem {
  id: string
  action: string
  desc: string
  keys: string[]
  category: "global" | "views" | "chat" | "studio"
}

type ShortcutDef = {
  id: string
  actionKey: string
  descKey: string
  keys: string[]
  category: ShortcutItem["category"]
}

const SHORTCUT_DEFS: ShortcutDef[] = [
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
    id: "cycle-permission-mode",
    actionKey: "settings.shortcuts.cyclePermission",
    descKey: "settings.shortcuts.cyclePermissionDesc",
    keys: ["Shift", "Tab"],
    category: "chat"
  }
]

function shortcutRegistry(t: TranslateFn): ShortcutItem[] {
  return SHORTCUT_DEFS.map((item) => ({
    id: item.id,
    action: t(item.actionKey),
    desc: t(item.descKey),
    keys: item.keys,
    category: item.category
  }))
}

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
  if (key === "Tab") return isMac ? "⇥" : "Tab"
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
  const t = useT()
  const [search, setSearch] = useState("")
  const isMac = isApplePlatform()
  const registry = useMemo(() => shortcutRegistry(t), [t])

  const filteredShortcuts = useMemo(() => {
    if (!search.trim()) return registry
    const q = search.toLowerCase().trim()
    return registry.filter(
      (item) =>
        item.action.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
    )
  }, [registry, search])

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
                  {t("settings.shortcuts.hubTitle")}
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  {isMac ? t("settings.shortcuts.layoutMac") : t("settings.shortcuts.layoutWin")}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                {t("settings.shortcuts.hubDesc")}
              </span>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("settings.shortcuts.searchPlaceholder")}
              className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pl-8 pr-2.5 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
            />
          </div>
        </div>
      </div>

      {/* ─── 分组快捷键列表 ─────────────────────────────── */}
      {globalItems.length > 0 && (
        <SettingsCard title={t("settings.shortcuts.groupGlobal")}>
          {globalItems.map((item) => (
            <SettingsRow key={item.id} title={item.action} description={item.desc}>
              <ShortcutKeys keys={item.keys} />
            </SettingsRow>
          ))}
        </SettingsCard>
      )}

      {viewItems.length > 0 && (
        <SettingsCard title={t("settings.shortcuts.groupViews")}>
          {viewItems.map((item) => (
            <SettingsRow key={item.id} title={item.action} description={item.desc}>
              <ShortcutKeys keys={item.keys} />
            </SettingsRow>
          ))}
        </SettingsCard>
      )}

      {chatItems.length > 0 && (
        <SettingsCard title={t("settings.shortcuts.groupChat")}>
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
          <p className="text-caption-1-medium text-text-primary">{t("settings.shortcuts.empty")}</p>
          <p className="text-caption-2-regular text-text-tertiary mt-0.5">
            {t("settings.shortcuts.emptyHint")}
          </p>
        </div>
      )}
    </div>
  )
}
