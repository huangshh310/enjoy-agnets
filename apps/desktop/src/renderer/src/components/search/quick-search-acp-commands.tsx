/**
 * ⌘L 里的 ACP 命令：来自 available_commands_update，点了当用户句发出。
 */
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { useAcpCommands } from "@renderer/stores/acp-commands"
import { sendComposerMessage } from "@renderer/hooks/runtime-interact/send-composer-run"
import { useT } from "@renderer/i18n"

export function QuickSearchAcpCommands({ onPick }: { onPick: () => void }) {
  const t = useT()
  const commands = useAcpCommands((state) => state.commands)
  if (commands.length === 0) return null
  return (
    <CommandGroup heading={t("command.groupAcp")}>
      {commands.map((command) => (
        <CommandItem
          key={command.name}
          value={`acp ${command.name} ${command.description ?? ""}`}
          onSelect={() => {
            onPick()
            void sendComposerMessage({ content: `/${command.name}` })
          }}
        >
          <span className="font-mono">/{command.name}</span>
          {command.description ? (
            <span className="truncate text-text-tertiary">{command.description}</span>
          ) : null}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
