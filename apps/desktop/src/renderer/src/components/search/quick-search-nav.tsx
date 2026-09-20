/**
 * ⌘L 里的模块 / 操作 / 设置项。和快捷键目录同一套跳转，不在 Dialog 里平铺。
 */
import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"

type NavigateFn = ReturnType<typeof useNavigate>
import {
  RiAddLine,
  RiApps2Line,
  RiBookOpenLine,
  RiChat1Line,
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
import { McpIcon } from "@renderer/components/mcp/components/mcp-brand-icons.ts"
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command"
import { openFolder, startPersistedSession } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"

type NavItem = {
  id: string
  label: string
  icon: ReactNode
  run: (navigate: NavigateFn) => void
}

export function QuickSearchNav({
  navigate,
  onSelect
}: {
  navigate: NavigateFn
  onSelect: (action: () => void) => void
}) {
  const t = useT()
  const icon = "size-4 text-accent-500"
  const muted = "size-4 text-text-secondary"
  const studio: NavItem[] = [
    { id: "chat", label: t("command.chat"), icon: <RiChat1Line className={icon} />, run: (go) => void go({ to: "/" }) },
    { id: "workflows", label: t("command.workflows"), icon: <RiRouteLine className={icon} />, run: (go) => void go({ to: "/workflows" }) },
    { id: "extensions", label: t("command.extensions"), icon: <RiApps2Line className={icon} />, run: (go) => void go({ to: "/settings/$section", params: { section: "extensions" } }) },
    { id: "mcp", label: t("command.mcp"), icon: <McpIcon className={icon} />, run: (go) => void go({ to: "/mcp" }) },
    { id: "skills", label: t("command.skills"), icon: <RiSparklingLine className={icon} />, run: (go) => void go({ to: "/skills" }) },
    { id: "knowledge", label: t("command.knowledge"), icon: <RiBookOpenLine className={icon} />, run: (go) => void go({ to: "/knowledge" }) },
    { id: "media", label: t("command.media"), icon: <RiImageLine className={icon} />, run: (go) => void go({ to: "/media" }) },
    {
      id: "automations",
      label: t("command.automations"),
      icon: <RiFlashlightLine className={icon} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "automations" } })
    },
    {
      id: "customize",
      label: t("command.customize"),
      icon: <RiEqualizer3Line className={icon} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "instructions" } })
    },
    {
      id: "telemetry",
      label: t("command.observability"),
      icon: <RiPulseLine className={icon} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "telemetry" } })
    }
  ]
  const actions: NavItem[] = [
    {
      id: "new-chat",
      label: t("command.newChat"),
      icon: <RiAddLine className="size-4 text-accent-500" />,
      run: (go) => {
        void go({ to: "/" })
        void startPersistedSession()
      }
    },
    {
      id: "open-workspace",
      label: t("command.openWorkspace"),
      icon: <RiFolder6Line className={muted} />,
      run: (go) => {
        void go({ to: "/" })
        void openFolder()
      }
    }
  ]
  const settings: NavItem[] = [
    {
      id: "general",
      label: t("command.generalSettings"),
      icon: <RiSettings4Line className={muted} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "general" } })
    },
    {
      id: "archived",
      label: t("command.archivedChats"),
      icon: <RiInboxArchiveLine className={muted} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "archived" } })
    },
    {
      id: "providers",
      label: t("command.providers"),
      icon: <RiPlugLine className={muted} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "providers" } })
    },
    {
      id: "rules",
      label: t("command.rules"),
      icon: <RiShieldLine className={muted} />,
      run: (go) => void go({ to: "/settings/$section", params: { section: "rules" } })
    }
  ]

  return (
    <>
      <NavGroup heading={t("command.groupStudio")} items={studio} navigate={navigate} onSelect={onSelect} />
      <CommandSeparator />
      <NavGroup heading={t("command.groupActions")} items={actions} navigate={navigate} onSelect={onSelect} />
      <CommandSeparator />
      <NavGroup heading={t("command.groupSettings")} items={settings} navigate={navigate} onSelect={onSelect} />
    </>
  )
}

function NavGroup({
  heading,
  items,
  navigate,
  onSelect
}: {
  heading: string
  items: NavItem[]
  navigate: NavigateFn
  onSelect: (action: () => void) => void
}) {
  return (
    <CommandGroup heading={heading}>
      {items.map((item) => (
        <CommandItem key={item.id} value={item.label} onSelect={() => onSelect(() => item.run(navigate))}>
          {item.icon}
          <span>{item.label}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
