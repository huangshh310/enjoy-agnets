/**
 * 对话里按 ? 打开的快捷键表。条目来自设置页的 SHORTCUT_DEFS。
 */
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SHORTCUT_DEFS } from "@renderer/components/settings/shortcut-defs"
import { useT } from "@renderer/i18n"
import { canOpenShortcutSheet, groupShortcutDefs } from "./shortcut-sheet-logic"

export function ShortcutSheet() {
  const t = useT()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.metaKey || event.ctrlKey || event.altKey) return
      const stage = document.querySelector<HTMLElement>("[data-chat-stage]")
      const threadVisible = stage?.dataset.chatSurface === "thread" && stage.closest(".hidden") == null
      if (!canOpenShortcutSheet(event.target instanceof HTMLElement ? event.target : null, threadVisible)) return
      event.preventDefault()
      setOpen((value) => !value)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const groups = groupShortcutDefs(SHORTCUT_DEFS)
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(32rem,calc(100vh-4rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.shortcuts.hubTitle")}</DialogTitle>
        </DialogHeader>
        <ShortcutGroup title={t("settings.shortcuts.groupGlobal")} items={groups.global} mac={mac} />
        <ShortcutGroup title={t("settings.shortcuts.groupViews")} items={groups.views} mac={mac} />
        <ShortcutGroup title={t("settings.shortcuts.groupChat")} items={groups.chat} mac={mac} />
      </DialogContent>
    </Dialog>
  )
}

function ShortcutGroup({
  title,
  items,
  mac
}: {
  title: string
  items: Array<{ id: string; actionKey: string; keys: string[] }>
  mac: boolean
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
            <span className="font-mono text-caption-2-medium text-text-secondary">{item.keys.map((key) => glyph(key, mac)).join(" ")}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function glyph(key: string, mac: boolean): string {
  if (key === "Mod") return mac ? "⌘" : "Ctrl"
  if (key === "Shift") return mac ? "⇧" : "Shift"
  if (key === "Alt") return mac ? "⌥" : "Alt"
  return key
}
