"use client"

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
import { Avatar } from "@/components/base/avatar/avatar"
import { Button } from "@/components/base/buttons/button"
import { Kbd } from "@/components/base/kbd/kbd"
import { cx } from "@/utils/cx"
import { formatNodeTime, useChatStore } from "@renderer/stores/chat-store"

export function AiChatSidebar() {
  const repositories = useChatStore((state) => state.repositories)
  const expandedIds = useChatStore((state) => state.expandedIds)
  const sessionId = useChatStore((state) => state.sessionId)
  const selectSession = useChatStore((state) => state.selectSession)
  const toggleExpanded = useChatStore((state) => state.toggleExpanded)
  const setSettingsOpen = useChatStore((state) => state.setSettingsOpen)
  const startNewSession = useChatStore((state) => state.startNewSession)

  const roots = repositories.filter((node) => node.kind === "workspace")

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar">
      <div className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]">
        <div className="flex w-full items-center justify-between">
          <DashboardUserMenu />
          <button
            type="button"
            aria-label="Collapse sidebar"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiSideBarFill className="size-5 -scale-x-100" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-full bg-background-tertiary-default p-2"
        >
          <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <span className="flex-1 text-left text-body-medium text-text-secondary">
            Quick Search
          </span>
          <Kbd>⌘L</Kbd>
        </button>

        <nav className="flex w-full flex-col gap-1 px-0.5">
          <SidebarAction icon={RiAddLine} label="New agent" onClick={startNewSession} />
          <SidebarAction icon={RiGridLine} label="Automations" />
          <SidebarAction icon={RiEqualizer3Line} label="Customize" />
        </nav>

        <div className="flex flex-col gap-1">
          <p className="px-2 pt-1 text-body-medium text-text-secondary">Repositories</p>
          {roots.map((workspace) => {
            const children = repositories.filter((node) => node.parentId === workspace.id)
            const expanded = expandedIds.includes(workspace.id) && children.length > 0
            return (
              <div key={workspace.id}>
                <button
                  type="button"
                  onClick={() => (children.length ? toggleExpanded(workspace.id) : undefined)}
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
                        <SessionTreeGuide
                          first={index === 0}
                          last={index === children.length - 1}
                        />
                        <button
                          type="button"
                          onClick={() => selectSession(session.id)}
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
                            {formatNodeTime(session.updatedAt)}
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
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 pt-3">
        <ThemeToggle appearance="sidebar-segmented" />
        <nav className="flex w-full flex-col gap-1">
          <SidebarAction icon={RiCustomerServiceLine} label="Support" />
          <SidebarAction
            icon={RiSettings4Line}
            label="Settings"
            onClick={() => setSettingsOpen("keys")}
          />
        </nav>
        <div className="flex w-full items-center gap-2 rounded-xl bg-background-tertiary-default py-2 pr-2 pl-2.5">
          <Avatar size="md" color="blue" initials="B" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-text-primary">Board team</p>
            <p className="truncate text-body-regular text-text-secondary">Pro Plan</p>
          </div>
          <Button size="xs" variant="primary" className="shrink-0">
            Upgrade
          </Button>
        </div>
      </div>
    </aside>
  )
}

function SidebarAction({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof RiAddLine
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-2lg p-2 text-left hover:bg-background-secondary-hover"
    >
      <Icon className="size-5 text-foreground-icon-secondary" aria-hidden />
      <span className="text-body-medium text-text-secondary">{label}</span>
    </button>
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
