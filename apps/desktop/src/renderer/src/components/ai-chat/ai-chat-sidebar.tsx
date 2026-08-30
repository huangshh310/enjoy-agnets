"use client"

import { type ComponentType, type ReactNode } from "react"
import {
  RiAddLine,
  RiCustomerServiceLine,
  RiEqualizer3Line,
  RiFolder6Line,
  RiGridLine,
  RiSearchLine,
  RiSettings4Line,
  RiSideBarFill
} from "@remixicon/react"
import { DashboardUserMenu } from "@/components/application/dashboard/dashboard-user-menu"
import { ThemeToggle } from "@/components/application/theme/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cx } from "@/utils/cx"
import type { RepositoryNode } from "@renderer/stores/chat-store"

type IconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export function AiChatSidebar({
  userName,
  collapsed,
  onToggleCollapsed,
  repositories,
  expandedIds,
  sessionId,
  onToggleExpanded,
  onSelectSession,
  onNewSession,
  onOpenWorkspace,
  onOpenSettings,
  formatTime
}: {
  userName: string
  collapsed: boolean
  onToggleCollapsed: () => void
  repositories: RepositoryNode[]
  expandedIds: string[]
  sessionId: string | null
  onToggleExpanded: (id: string) => void
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onOpenWorkspace: () => void
  onOpenSettings: () => void
  formatTime: (timestamp: number) => string
}) {
  const roots = repositories.filter((node) => node.kind === "workspace")
  const initials = userName.slice(0, 1).toUpperCase()

  return (
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[60px] px-[11px] py-3" : "w-[260px] p-3"
      )}
    >
      <div className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]">
        <div className={cx("flex w-full transition-[gap] duration-300 ease-in-out", collapsed ? "flex-col-reverse items-start justify-center gap-2.5" : "flex-row items-center justify-between")}>
          <div className="-m-2 min-w-0 overflow-hidden p-2">
            <DashboardUserMenu collapsed={collapsed} name={userName} initials={initials} />
          </div>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapsed}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiSideBarFill className={cx("size-5", collapsed ? "" : "-scale-x-100")} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          aria-label="Quick Search"
          title={collapsed ? "Quick Search" : undefined}
          onClick={() => {
            if (collapsed) onToggleCollapsed()
          }}
          className={cx(
            "flex cursor-pointer items-center bg-background-tertiary-default transition-[width,border-radius] duration-300 ease-in-out",
            collapsed ? "size-9 justify-center rounded-2lg" : "w-full gap-2 rounded-full p-2"
          )}
        >
          <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <Collapsible collapsed={collapsed} className="flex-1">
            <span className="flex-1 text-left text-body-medium whitespace-nowrap text-text-secondary">Quick Search</span>
          </Collapsible>
          <Collapsible collapsed={collapsed}>
            <Kbd>⌘L</Kbd>
          </Collapsible>
        </button>

        <nav className={cx("flex w-full flex-col gap-1", collapsed && "items-center")}>
          <SidebarAction collapsed={collapsed} icon={RiAddLine} label="New agent" onClick={onNewSession} />
          <SidebarAction collapsed={collapsed} icon={RiFolder6Line} label="Open folder" onClick={onOpenWorkspace} />
          <SidebarAction collapsed={collapsed} icon={RiGridLine} label="Automations" />
          <SidebarAction collapsed={collapsed} icon={RiEqualizer3Line} label="Customize" />
        </nav>

        {collapsed ? null : (
          <div className="flex flex-col gap-1">
              <p className="px-2 pt-1 text-body-medium text-text-secondary">Repositories</p>
              {roots.length === 0 ? (
                <p className="px-2 text-caption-1-medium text-text-tertiary">
                  Open a folder to list workspaces and sessions.
                </p>
              ) : null}
              {roots.map((workspace) => {
                const children = repositories.filter((node) => node.parentId === workspace.id)
                const expanded = expandedIds.includes(workspace.id) && children.length > 0
                return (
                  <div key={workspace.id}>
                    <button
                      type="button"
                      onClick={() => (children.length ? onToggleExpanded(workspace.id) : undefined)}
                      className="flex w-full items-center gap-2 rounded-2lg p-2 text-left hover:bg-background-secondary-hover"
                    >
                      <RiFolder6Line className="size-5 text-foreground-icon-secondary" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-body-medium text-text-secondary">
                        {workspace.name}
                      </span>
                    </button>
                    {expanded ? (
                      <div className="relative ml-[26px]">
                        {children.map((session, index) => (
                          <div key={session.id} className="relative">
                            <SessionTreeGuide first={index === 0} last={index === children.length - 1} />
                            <button
                              type="button"
                              onClick={() => onSelectSession(session.id)}
                              className={cx(
                                "flex w-full items-center gap-2 rounded-2lg py-1.5 pr-2 pl-3.5 text-left",
                                session.id === sessionId
                                  ? "bg-background-tertiary-default"
                                  : "hover:bg-background-secondary-hover"
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate text-body-medium text-text-secondary">
                                {session.name}
                              </span>
                              <span className="text-caption-1-medium text-text-tertiary">
                                {formatTime(session.updatedAt)}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
        )}
      </div>

      <div className={cx("flex w-full shrink-0 flex-col gap-3 pt-3", collapsed && "items-center")}>
        {collapsed ? <ThemeToggle collapsed /> : <ThemeToggle appearance="sidebar-segmented" />}
        <nav className={cx("flex w-full flex-col gap-1", collapsed && "items-center")}>
          <SidebarAction collapsed={collapsed} icon={RiCustomerServiceLine} label="Support" />
          <SidebarAction collapsed={collapsed} icon={RiSettings4Line} label="Settings" onClick={onOpenSettings} />
        </nav>
        <div className={cx("flex items-center rounded-xl", collapsed ? "w-9 justify-center" : "w-full gap-2 bg-background-tertiary-default py-2 pr-2 pl-2.5")}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent-500 text-caption-1-semibold text-text-white">
              E
            </AvatarFallback>
          </Avatar>
          {collapsed ? null : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-medium text-text-primary">Enjoy Agents</p>
                <p className="truncate text-body-regular text-text-secondary">Local first</p>
              </div>
              <Button size="xs" className="shrink-0" onClick={onOpenWorkspace}>
                Folder
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarAction({
  icon: Icon,
  label,
  onClick,
  collapsed = false
}: {
  icon: IconComponent
  label: string
  onClick?: () => void
  collapsed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "flex items-center overflow-hidden rounded-2lg p-2 text-left transition-[width,background-color] duration-300 ease-in-out hover:bg-background-secondary-hover",
        collapsed ? "w-9 justify-center" : "w-full gap-2"
      )}
    >
      <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
      <Collapsible collapsed={collapsed}>
        <span className="text-body-medium whitespace-nowrap text-text-secondary">{label}</span>
      </Collapsible>
    </button>
  )
}

function Collapsible({
  collapsed,
  children,
  className
}: {
  collapsed: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
        className
      )}
    >
      {children}
    </span>
  )
}

function SessionTreeGuide({ first, last }: { first: boolean; last: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute left-0 w-3 rounded-bl-[6px] border-b border-l border-separator-border",
          first ? "-top-1.5 h-[21px]" : "top-0 h-[18px]"
        )}
      />
      {last ? null : (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 top-[18px] w-px bg-separator-border"
        />
      )}
    </>
  )
}
