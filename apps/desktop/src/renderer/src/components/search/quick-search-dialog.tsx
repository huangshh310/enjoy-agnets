/**
 * 全局快捷命令面板 (Quick Search / ⌘L):
 * 快速跳转 Agent Studio、各大能力模块、设置与历史会话。
 */
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiAddLine,
  RiBookOpenLine,
  RiChat3Line,
  RiDashboardLine,
  RiEqualizer3Line,
  RiFlashlightLine,
  RiFolder6Line,
  RiImageLine,
  RiInboxArchiveLine,
  RiPlugLine,
  RiPulseLine,
  RiRouteLine,
  RiSettings4Line,
  RiShieldLine
} from "@remixicon/react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command"
import {
  openFolder,
  selectPersistedSession,
  startPersistedSession
} from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"

export function openQuickSearch() {
  window.dispatchEvent(new CustomEvent("enjoy:open-quick-search"))
}

export function QuickSearchDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const repositories = useChatStore((state) => state.repositories)
  const sessionNodes = repositories.filter((item) => item.kind === "session")

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && (event.key.toLowerCase() === "l" || event.key.toLowerCase() === "k")) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    function onCustomOpen() {
      setOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("enjoy:open-quick-search", onCustomOpen)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("enjoy:open-quick-search", onCustomOpen)
    }
  }, [])

  function handleSelect(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Quick Search & Navigation"
      description="Jump to Agent Studio, tools, settings, or recent sessions..."
    >
      <CommandInput placeholder="Type a command, page, or search sessions (e.g. mcp, workflows)..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Studio & Capabilities */}
        <CommandGroup heading="Agent Studio & Capabilities">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/studio" })
              })
            }
          >
            <RiDashboardLine className="size-4 text-accent-500" />
            <span>Agent Studio Hub (Dashboard)</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/workflows" })
              })
            }
          >
            <RiRouteLine className="size-4 text-accent-500" />
            <span>Durable Workflows & DAG</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/mcp" })
              })
            }
          >
            <RiPlugLine className="size-4 text-accent-500" />
            <span>Model Context Protocol (MCP)</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/knowledge" })
              })
            }
          >
            <RiBookOpenLine className="size-4 text-accent-500" />
            <span>Knowledge Base & Semantic RAG</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/media" })
              })
            }
          >
            <RiImageLine className="size-4 text-accent-500" />
            <span>Media Studio (Image / Speech / Video)</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/automations" })
              })
            }
          >
            <RiFlashlightLine className="size-4 text-accent-500" />
            <span>Automations & Triggers</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/customize/$section",
                  params: { section: "instructions" }
                })
              })
            }
          >
            <RiEqualizer3Line className="size-4 text-accent-500" />
            <span>Customize System Prompts & Instructions</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/observability" })
              })
            }
          >
            <RiPulseLine className="size-4 text-accent-500" />
            <span>Observability & Telemetry Trace</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/" })
                void startPersistedSession()
              })
            }
          >
            <RiAddLine className="size-4 text-emerald-500" />
            <span>New Agent Chat Session</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/" })
                void openFolder()
              })
            }
          >
            <RiFolder6Line className="size-4 text-text-secondary" />
            <span>Open / Switch Workspace Folder...</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings & Configuration */}
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "general" }
                })
              })
            }
          >
            <RiSettings4Line className="size-4 text-text-secondary" />
            <span>General Settings</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "archived" }
                })
              })
            }
          >
            <RiInboxArchiveLine className="size-4 text-text-secondary" />
            <span>已归档的聊天</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "providers" }
                })
              })
            }
          >
            <RiPlugLine className="size-4 text-text-secondary" />
            <span>Model Providers & API Keys</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/customize/$section",
                  params: { section: "rules" }
                })
              })
            }
          >
            <RiShieldLine className="size-4 text-text-secondary" />
            <span>Rules & Tool Permissions</span>
          </CommandItem>
        </CommandGroup>

        {/* Recent Chat Sessions if available */}
        {sessionNodes.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Chat Sessions">
              {sessionNodes.slice(0, 8).map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() =>
                    handleSelect(() => {
                      void selectPersistedSession(s.id)
                      void navigate({ to: "/" })
                    })
                  }
                >
                  <RiChat3Line className="size-4 text-text-tertiary" />
                  <span className="truncate">{s.name || "Untitled Session"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

