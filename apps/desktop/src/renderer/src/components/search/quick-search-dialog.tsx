/**
 * 全局快捷命令面板 (Quick Search / ⌘L):
 * 命令、设置、会话、本会话消息。
 */
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command"
import { selectPersistedSession } from "@renderer/hooks/use-agent-session"
import { SessionAgentMark } from "@renderer/components/ai-chat/sidebar/session-agent-mark"
import { useChatStore } from "@renderer/stores/chat-store"
import { QuickSearchAcpCommands } from "./quick-search-acp-commands"
import { QuickSearchMessages } from "./quick-search-messages"
import { QuickSearchNav } from "./quick-search-nav"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import { filterQuickSearchSessions } from "./filter-quick-search-sessions"
import { QuickSearchShortcuts } from "./quick-search-shortcuts"

export function openQuickSearch() {
  window.dispatchEvent(new CustomEvent("enjoy:open-quick-search"))
}

export function QuickSearchDialog() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const repositories = useChatStore((state) => state.repositories)
  const sessionNodes = filterQuickSearchSessions(
    repositories.filter((item) => item.kind === "session"),
    query
  )

  useKeybindingCommand("search.quick", () => {
    setOpen((prev) => !prev)
    return true
  })

  useEffect(() => {
    function onCustomOpen() {
      setOpen(true)
    }

    window.addEventListener("enjoy:open-quick-search", onCustomOpen)
    return () => window.removeEventListener("enjoy:open-quick-search", onCustomOpen)
  }, [])

  function handleSelect(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
      title={t("command.title")}
      description={t("command.description")}
    >
      <CommandInput
        placeholder={t("command.placeholder")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t("command.empty")}</CommandEmpty>
        <QuickSearchMessages
          query={query}
          onPick={() => {
            setOpen(false)
            void navigate({ to: "/" })
          }}
        />
        <QuickSearchAcpCommands onPick={() => setOpen(false)} />
        <QuickSearchShortcuts query={query} onPick={() => setOpen(false)} />
        <QuickSearchNav navigate={navigate} onSelect={handleSelect} />
        {sessionNodes.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.groupRecent")}>
              {sessionNodes.map((session) => {
                const title = session.name || t("common.untitledSession")
                return (
                <CommandItem
                  key={session.id}
                  value={`${title} ${session.id}`}
                  onSelect={() =>
                    handleSelect(() => {
                      void selectPersistedSession(session.id)
                      void navigate({ to: "/" })
                    })
                  }
                >
                  <SessionAgentMark sessionId={session.id} size={16} />
                  <span className="truncate">{title}</span>
                </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
