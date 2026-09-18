/**
 * 命令面板里搜本会话消息，点选滚到对应气泡。
 */
import { RiChat1Line, RiUserLine } from "@remixicon/react"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { revealThreadMessage, searchThreadMessages } from "@renderer/lib/search-thread-messages"

export function QuickSearchMessages({
  query,
  onPick
}: {
  query: string
  onPick: () => void
}) {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const hits = searchThreadMessages(messages, query)
  if (hits.length === 0) return null

  return (
    <CommandGroup heading={t("command.groupMessages")}>
      {hits.map((hit) => (
        <CommandItem
          key={hit.id}
          value={`message ${hit.preview}`}
          onSelect={() => {
            onPick()
            requestAnimationFrame(() => revealThreadMessage(hit.id))
          }}
        >
          {hit.role === "user" ? (
            <RiUserLine className="size-4 text-accent-500" />
          ) : (
            <RiChat1Line className="size-4 text-text-secondary" />
          )}
          <span className="truncate">{hit.preview}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
