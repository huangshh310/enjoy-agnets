/**
 * ⌘L 列出与设置页同一套快捷键 id。选中对话类命令时聚焦输入框。
 */
import { RiKeyboardBoxLine } from "@remixicon/react"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { focusComposerEnd } from "@renderer/hooks/composer-focus"
import { useT } from "@renderer/i18n"
import { SHORTCUT_DEFS } from "../settings/shortcut-defs"

export function QuickSearchShortcuts({ onPick }: { onPick: () => void }) {
  const t = useT()
  return (
    <CommandGroup heading={t("command.groupShortcuts")}>
      {SHORTCUT_DEFS.map((item) => (
        <CommandItem
          key={item.id}
          value={`${item.id} ${t(item.actionKey)} ${t(item.descKey)}`}
          onSelect={() => {
            onPick()
            if (item.category === "chat") focusComposerEnd()
          }}
        >
          <RiKeyboardBoxLine className="size-4 text-text-secondary" />
          <span className="min-w-0 flex-1 truncate">{t(item.actionKey)}</span>
          <span className="shrink-0 font-mono text-caption-2-regular text-text-tertiary">
            {item.keys.join("+")}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
