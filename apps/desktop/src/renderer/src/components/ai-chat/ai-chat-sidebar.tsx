"use client"

/**
 * 聊天侧栏壳：品牌、导航、仓库树、折叠态。
 */
import { RiAddLine, RiSearchLine } from "@remixicon/react"
import { DashboardUserMenu } from "@/components/application/dashboard/dashboard-user-menu"
import { Kbd } from "@/components/ui/kbd"
import { cx } from "@/utils/cx"
import { Collapsible, SidebarAction } from "@renderer/components/ai-chat/sidebar/sidebar-action"
import { SidebarRepos } from "@renderer/components/ai-chat/sidebar/sidebar-repos"
import { SidebarUserCard } from "@renderer/components/ai-chat/sidebar/sidebar-user-card"
import { openQuickSearch } from "@renderer/components/search/quick-search-dialog"
import type { RepositoryNode } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"


export function AiChatSidebar({
  userName,
  collapsed = false,
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
  collapsed?: boolean
  onToggleCollapsed?: () => void
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-between overflow-hidden px-2.5 py-2">
      <div className="flex min-h-0 w-full flex-col gap-3 overflow-y-auto [scrollbar-width:none]">
        <SidebarHeader collapsed={collapsed} userName={userName} initials={initials} />
        <QuickSearch collapsed={collapsed} onExpand={onToggleCollapsed} />
        <nav className={cx("flex w-full flex-col gap-1", collapsed && "items-center")}>
          <SidebarAction collapsed={collapsed} icon={RiAddLine} label={t("chat.newAgent")} onClick={onNewSession} />
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
    </div>
  )
}

function SidebarHeader({
  collapsed,
  userName,
  initials
}: {
  collapsed: boolean
  userName: string
  initials: string
}) {
  return (
    <div className="flex w-full items-center">
      <div className="-m-2 min-w-0 overflow-hidden p-2">
        <DashboardUserMenu collapsed={collapsed} name={userName} initials={initials} />
      </div>
    </div>
  )
}

function QuickSearch({ collapsed, onExpand }: { collapsed: boolean; onExpand?: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      aria-label={t("common.quickSearch")}
      title={collapsed ? t("common.quickSearchKbd", { key: "⌘L" }) : undefined}
      onClick={() => {
        if (collapsed) onExpand?.()
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
    <div className={cx("flex w-full shrink-0 flex-col pt-2 border-t border-separator-border/40", collapsed && "items-center")}>
      <SidebarUserCard
        collapsed={collapsed}
        userName={userName}
        sessionCount={sessionCount}
        onOpenWorkspace={onOpenWorkspace}
      />
    </div>
  )
}
