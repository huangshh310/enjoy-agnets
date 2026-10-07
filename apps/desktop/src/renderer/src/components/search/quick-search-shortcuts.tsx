/**
 * ⌘L 列出与设置页同一份解析后的快捷键。选中对话类命令时聚焦输入框。
 */
import { resolveKeybindings } from "@enjoy-agents/ipc-contract"
import { RiKeyboardBoxLine } from "@remixicon/react"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { metaFor } from "@renderer/components/settings/keybindings/keybinding-catalog"
import { chordGlyphs } from "@renderer/components/settings/keybindings/keybinding-format"
import { focusComposerEnd } from "@renderer/hooks/composer-focus"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"

export function QuickSearchShortcuts({ onPick }: { onPick: () => void }) {
  const t = useT()
  const { data } = useSettingsSnapshot()
  const rows = resolveKeybindings(data?.preferences.keybindings ?? [])
  return (
    <CommandGroup heading={t("command.groupShortcuts")}>
      {rows.map((rule) => {
        const meta = metaFor(rule.command)
        const label = rule.key === "unassigned" ? t("settings.shortcuts.unassigned") : chordGlyphs(rule.key).join(" ")
        return (
          <CommandItem
            key={`${rule.command}-${rule.key}`}
            value={`${rule.command} ${rule.key} ${t(meta.actionKey)} ${t(meta.descKey)}`}
            onSelect={() => {
              onPick()
              if (meta.category === "chat") focusComposerEnd()
            }}
          >
            <RiKeyboardBoxLine className="size-4 text-text-secondary" />
            <span className="min-w-0 flex-1 truncate">{t(meta.actionKey)}</span>
            <span className="shrink-0 font-mono text-caption-2-regular text-text-tertiary">{label}</span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}
