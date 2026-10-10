/**
 * ⌘L 列出与设置页同一份解析后的快捷键。选中对话类命令时聚焦输入框。
 * 设置页 ⌘L / ⌘K 分行；面板把同一命令的多个键收成一行。
 */
import { resolveKeybindings, type KeybindingCommand } from "@enjoy-agents/ipc-contract"
import { RiKeyboardBoxLine } from "@remixicon/react"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { labelKeysForBinding, metaFor } from "@renderer/components/settings/keybindings/keybinding-catalog"
import { chordGlyphs } from "@renderer/components/settings/keybindings/keybinding-format"
import { focusComposerEnd } from "@renderer/hooks/composer-focus"
import { shortcutRowMatches } from "./filter-shortcut-rows"
import { mergeShortcutRows } from "./merge-shortcut-rows"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"

export function QuickSearchShortcuts({ query, onPick }: { query: string; onPick: () => void }) {
  const t = useT()
  const { data } = useSettingsSnapshot()
  const rows = mergeShortcutRows(resolveKeybindings(data?.preferences.keybindings ?? [])).filter((row) => {
    const copy = shortcutRowCopy(row, t)
    return shortcutRowMatches(`${row.command} ${row.keys.join(" ")} ${copy.title} ${copy.desc}`, query)
  })
  if (rows.length === 0) return null
  return (
    <CommandGroup heading={t("command.groupShortcuts")}>
      {rows.map((row) => {
        const meta = metaFor(row.command)
        const copy = shortcutRowCopy(row, t)
        const label = row.keys
          .map((key) => (key === "unassigned" ? t("settings.shortcuts.unassigned") : chordGlyphs(key).join(" ")))
          .filter((part) => part.length > 0)
          .join(" · ")
        return (
          <CommandItem
            key={`${row.command}-${row.keys.join("-")}`}
            value={`${row.command} ${row.keys.join(" ")} ${copy.title} ${copy.desc}`}
            onSelect={() => {
              onPick()
              if (meta.category === "chat") focusComposerEnd()
            }}
          >
            <RiKeyboardBoxLine className="size-4 text-text-secondary" />
            <span className="min-w-0 flex-1 truncate">{copy.title}</span>
            <span className="shrink-0 font-mono text-caption-2-regular text-text-tertiary">{label}</span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

function shortcutRowCopy(row: { command: KeybindingCommand; keys: string[] }, t: (key: string) => string) {
  const labels = labelKeysForBinding(row.command, row.keys[0] ?? "unassigned")
  const title =
    row.command === "search.quick" && row.keys.length > 1
      ? t("command.quickSearchAndPalette")
      : t(labels.actionKey)
  return { title, desc: t(labels.descKey) }
}

