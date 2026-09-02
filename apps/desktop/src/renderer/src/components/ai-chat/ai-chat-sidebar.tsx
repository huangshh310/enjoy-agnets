"use client"

/**
 * 聊天侧栏壳：品牌、导航、仓库树、折叠态。
 */
import {
  RiAddLine,
  RiDashboardLine,
  RiSearchLine,
  RiSideBarFill
} from "@remixicon/react"
import { DashboardUserMenu } from "@/components/application/dashboard/dashboard-user-menu"
import { Kbd } from "@/components/ui/kbd"
import { cx } from "@/utils/cx"
import { Collapsible, SidebarAction } from "@renderer/components/ai-chat/sidebar/sidebar-action"
import { SidebarModuleRails } from "@renderer/components/ai-chat/sidebar/sidebar-module-rails"
import { SidebarRepos } from "@renderer/components/ai-chat/sidebar/sidebar-repos"
import { SidebarUserCard } from "@renderer/components/ai-chat/sidebar/sidebar-user-card"
import { openQuickSearch } from "@renderer/components/search/quick-search-dialog"
import type { RepositoryNode } from "@renderer/stores/chat-store"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"


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
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const initials = userName.slice(0, 1).toUpperCase()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const isStudioActive =
    pathname.startsWith("/studio") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/customize") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/workflows") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/mcp") ||
    pathname.startsWith("/observability")

  return (
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[60px] px-[11px] py-3" : "w-[260px] p-3"
      )}
    >
      <div className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]">
        <SidebarHeader
          collapsed={collapsed}
          userName={userName}
          initials={initials}
          onToggleCollapsed={onToggleCollapsed}
        />
        <QuickSearch collapsed={collapsed} onExpand={onToggleCollapsed} />
        <nav className={cx("flex w-full flex-col gap-1", collapsed && "items-center")}>
          <SidebarAction collapsed={collapsed} icon={RiAddLine} label={t("chat.newAgent")} onClick={onNewSession} />
          <SidebarAction
            collapsed={collapsed}
            icon={RiDashboardLine}
            label={t("common.agentStudio")}
            active={isStudioActive}
            onClick={() => void navigate({ to: "/studio" })}
          />
        </nav>
        {collapsed ? null : (
          <SidebarRepos
            repositories={repositories}
            expandedIds={expandedIds}
            sessionId={sessionId}
            onToggleExpanded={onToggleExpanded}
            onSelectSession={onSelectSession}
            formatTime={formatTime}
          />
        )}
      </div>
      <SidebarFooter
        collapsed={collapsed}
        userName={userName}
        sessionCount={repositories.filter((node) => node.kind === "session").length}
        onOpenWorkspace={onOpenWorkspace}
      />
    </aside>
  )
}

function SidebarHeader({
  collapsed,
  userName,
  initials,
  onToggleCollapsed
}: {
  collapsed: boolean
  userName: string
  initials: string
  onToggleCollapsed: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        "flex w-full transition-[gap] duration-300 ease-in-out",
        collapsed ? "flex-col-reverse items-start justify-center gap-2.5" : "flex-row items-center justify-between"
      )}
    >
      <div className="-m-2 min-w-0 overflow-hidden p-2">
        <DashboardUserMenu collapsed={collapsed} name={userName} initials={initials} />
      </div>
      <button
        type="button"
        aria-label={collapsed ? t("chat.expandSidebar") : t("chat.collapseSidebar")}
        onClick={onToggleCollapsed}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <RiSideBarFill className={cx("size-5", collapsed ? "" : "-scale-x-100")} aria-hidden />
      </button>
    </div>
  )
}

function QuickSearch({ collapsed, onExpand }: { collapsed: boolean; onExpand: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      aria-label={t("common.quickSearch")}
      title={collapsed ? t("common.quickSearchKbd", { key: "⌘L" }) : undefined}
      onClick={() => {
        if (collapsed) onExpand()
        openQuickSearch()
      }}
      className={cx(
        "flex cursor-pointer items-center bg-background-tertiary-default transition-[width,border-radius] duration-300 ease-in-out hover:bg-background-secondary-hover",
        collapsed ? "size-9 justify-center rounded-2lg" : "w-full gap-2 rounded-full p-2"
      )}
    >
      <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
      <Collapsible collapsed={collapsed} className="flex-1">
        <span className="flex-1 text-left text-body-medium whitespace-nowrap text-text-secondary">{t("common.quickSearch")}</span>
      </Collapsible>
      <Collapsible collapsed={collapsed}>
        <Kbd>⌘L</Kbd>
      </Collapsible>
    </button>
  )
}

function SidebarFooter({
  collapsed,
  userName,
  sessionCount,
  onOpenWorkspace
}: {
  collapsed: boolean
  userName: string
  sessionCount: number
  onOpenWorkspace: () => void
}) {
  return (
    <div className={cx("flex w-full shrink-0 flex-col gap-3 pt-3", collapsed && "items-center")}>
      <SidebarModuleRails collapsed={collapsed} />
      <SidebarUserCard
        collapsed={collapsed}
        userName={userName}
        sessionCount={sessionCount}
        onOpenWorkspace={onOpenWorkspace}
      />
    </div>
  )
}
