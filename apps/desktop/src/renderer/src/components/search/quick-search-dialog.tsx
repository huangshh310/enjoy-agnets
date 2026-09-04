/**
 * 全局快捷命令面板 (Quick Search / ⌘L):
 * 快速跳转工作模块、设置与历史会话。
 */
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import {
  RiAddLine,
  RiBookOpenLine,
  RiChat3Line,
  RiEqualizer3Line,
  RiFlashlightLine,
  RiFolder6Line,
  RiImageLine,
  RiInboxArchiveLine,
  RiPlugLine,
  RiPulseLine,
  RiRouteLine,
  RiSettings4Line,
  RiShieldLine,
  RiSparklingLine
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
  const t = useT()
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
      title={t("command.title")}
      description={t("command.description")}
    >
      <CommandInput placeholder={t("command.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("command.empty")}</CommandEmpty>

        <CommandGroup heading={t("command.groupStudio")}>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/workflows" })
              })
            }
          >
            <RiRouteLine className="size-4 text-accent-500" />
            <span>{t("command.workflows")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/mcp" })
              })
            }
          >
            <RiPlugLine className="size-4 text-accent-500" />
            <span>{t("command.mcp")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/skills" })
              })
            }
          >
            <RiSparklingLine className="size-4 text-accent-500" />
            <span>{t("command.skills")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/knowledge" })
              })
            }
          >
            <RiBookOpenLine className="size-4 text-accent-500" />
            <span>{t("command.knowledge")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/media" })
              })
            }
          >
            <RiImageLine className="size-4 text-accent-500" />
            <span>{t("command.media")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "automations" }
                })
              })
            }
          >
            <RiFlashlightLine className="size-4 text-accent-500" />
            <span>{t("command.automations")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "instructions" }
                })
              })
            }
          >
            <RiEqualizer3Line className="size-4 text-accent-500" />
            <span>{t("command.customize")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/observability" })
              })
            }
          >
            <RiPulseLine className="size-4 text-accent-500" />
            <span>{t("command.observability")}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.groupActions")}>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({ to: "/" })
                void startPersistedSession()
              })
            }
          >
            <RiAddLine className="size-4 text-emerald-500" />
            <span>{t("command.newChat")}</span>
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
            <span>{t("command.openWorkspace")}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.groupSettings")}>
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
            <span>{t("command.generalSettings")}</span>
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
            <span>{t("command.archivedChats")}</span>
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
            <span>{t("command.providers")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                void navigate({
                  to: "/settings/$section",
                  params: { section: "rules" }
                })
              })
            }
          >
            <RiShieldLine className="size-4 text-text-secondary" />
            <span>{t("command.rules")}</span>
          </CommandItem>
        </CommandGroup>

        {sessionNodes.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.groupRecent")}>
              {sessionNodes.slice(0, 8).map((session) => (
                <CommandItem
                  key={session.id}
                  onSelect={() =>
                    handleSelect(() => {
                      void selectPersistedSession(session.id)
                      void navigate({ to: "/" })
                    })
                  }
                >
                  <RiChat3Line className="size-4 text-text-tertiary" />
                  <span className="truncate">{session.name || t("common.untitledSession")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
