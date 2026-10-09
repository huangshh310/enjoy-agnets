/**
 * 对话里打开的快捷键表。条目来自解析后的快捷键，不再读死目录。
 */
import { useState } from "react"
import { resolveKeybindings } from "@enjoy-agents/ipc-contract"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { metaFor } from "@renderer/components/settings/keybindings/keybinding-catalog"
import { chordGlyphs } from "@renderer/components/settings/keybindings/keybinding-format"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { groupShortcutDefs } from "./shortcut-sheet-logic"

export function ShortcutSheet() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const { data } = useSettingsSnapshot()
  useKeybindingCommand("shortcuts.sheet", () => {
    setOpen((value) => !value)
    return true
  })
  const rows = resolveKeybindings(data?.preferences.keybindings ?? []).map((rule) => ({
    id: `${rule.command}-${rule.key}`,
    actionKey: metaFor(rule.command).actionKey,
    category: metaFor(rule.command).category,
    keys: rule.key === "unassigned" ? [t("settings.shortcuts.unassigned")] : chordGlyphs(rule.key)
  }))
  const groups = groupShortcutDefs(rows)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(32rem,calc(100vh-4rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.shortcuts.hubTitle")}</DialogTitle>
        </DialogHeader>
        <ShortcutGroup title={t("settings.shortcuts.groupGlobal")} items={groups.global} />
        <ShortcutGroup title={t("settings.shortcuts.groupViews")} items={groups.views} />
        <ShortcutGroup title={t("settings.shortcuts.groupChat")} items={groups.chat} />
      </DialogContent>
    </Dialog>
  )
}

function ShortcutGroup({
  title,
  items
}: {
  title: string
  items: Array<{ id: string; actionKey: string; keys: string[] }>
}) {
  const t = useT()
  if (items.length === 0) return null
  return (
    <section className="mt-3">
      <h3 className="text-caption-1-medium text-text-tertiary">{title}</h3>
      <ul className="mt-1 flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-caption-1-regular text-text-primary">{t(item.actionKey)}</span>
            <span className="font-mono text-caption-2-medium text-text-secondary">{item.keys.join(" ")}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
