/**
 * 侧栏项目与会话列表 (Sidebar Projects & Repositories):
 * 参考 Codex 桌面端交互：支持项目分组/单列表切换、多工作区折叠树、项目信息卡片、排序及创建项目弹窗。
 */
import { useMemo, useState } from "react"
import { RiAddLine, RiFolder6Line, RiMoreFill } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { DotMatrixLoader } from "@/components/ui/dot-matrix-loader"
import { SidebarWorkspaceRow } from "@renderer/components/ai-chat/sidebar/sidebar-workspace-row"
import { CreateProjectDialog } from "@renderer/components/workspace/create-project-dialog"
import { useChatStore, type RepositoryNode } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"


export function SidebarRepos({
  repositories,
  expandedIds,
  sessionId,
  onToggleExpanded,
  onSelectSession,
  formatTime
}: {
  repositories: RepositoryNode[]
  expandedIds: string[]
  sessionId: string | null
  onToggleExpanded: (id: string) => void
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const t = useT()
  const running = useChatStore((state) => state.running)
  const currentWorkspaceId = useChatStore((state) => state.workspaceId)
  const grouping = useChatStore((state) => state.sidebarGrouping)
  const setGrouping = useChatStore((state) => state.setSidebarGrouping)
  const sortOrder = useChatStore((state) => state.sessionSortOrder)
  const setSortOrder = useChatStore((state) => state.setSessionSortOrder)
  const pinnedIds = useChatStore((state) => state.pinnedWorkspaceIds)
  const workspaces = useMemo(() => {
    const wsNodes = repositories.filter((node) => node.kind === "workspace")
    return [...wsNodes].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return b.updatedAt - a.updatedAt
    })
  }, [pinnedIds, repositories])

  const allSessions = useMemo(() => {
    const list = repositories.filter((node) => node.kind === "session")
    if (sortOrder === "updated") {
      return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
    }
    return list
  }, [repositories, sortOrder])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* 1. Header with Projects / Repositories Title and Codex-style actions */}
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-body-medium font-semibold text-text-primary">{t("chat.projects")}</span>

        <div className="flex items-center gap-0.5">
          {/* More options menu (整理侧边栏 & 聊天排序方式) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("chat.organizeProjects")}
                className="flex size-6 items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                <RiMoreFill className="size-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-48 rounded-xl bg-background-primary-default shadow-card border border-border-button-default"
            >
              <DropdownMenuLabel className="text-caption-2-medium text-text-tertiary">
                {t("chat.organizeSidebar")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={grouping}
                onValueChange={(val) => setGrouping(val as "project" | "flat")}
              >
                <DropdownMenuRadioItem value="project" className="text-body-medium">
                  {t("chat.groupByProject")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="flat" className="text-body-medium">
                  {t("chat.groupFlat")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-caption-2-medium text-text-tertiary">
                {t("chat.sessionSort")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(val) => setSortOrder(val as "priority" | "updated" | "manual")}
              >
                <DropdownMenuRadioItem value="priority" className="text-body-medium">
                  {t("chat.sortPriority")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="updated" className="text-body-medium">
                  {t("chat.sortUpdated")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="manual" className="text-body-medium">
                  {t("chat.sortManual")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Project + Button */}
          <button
            type="button"
            title={t("chat.createProject")}
            onClick={() => setCreateDialogOpen(true)}
            className="flex size-6 items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <RiAddLine className="size-4" />
          </button>
        </div>
      </div>

      {/* 2. Workspaces Tree / Flat List */}
      {workspaces.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-button-default p-4 text-center">
          <RiFolder6Line className="size-6 text-text-tertiary" />
          <p className="text-caption-1-medium text-text-secondary">{t("chat.noProjects")}</p>
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="text-caption-2-medium text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
          >
            {t("chat.addProject")}
          </button>
        </div>
      ) : grouping === "flat" ? (
        <div className="flex flex-col gap-0.5">
          {allSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cx(
                "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                session.id === sessionId
                  ? "bg-background-tertiary-default font-medium text-text-primary shadow-2xs"
                  : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              )}
            >
              <span className="min-w-0 flex-1 truncate text-body-medium">{session.name}</span>
              {session.id === sessionId && running ? (
                <DotMatrixLoader variant="wave" className="shrink-0" />
              ) : (
                <span className="shrink-0 text-caption-2-medium text-text-tertiary">
                  {formatTime(session.updatedAt)}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {workspaces.map((workspace) => (
            <SidebarWorkspaceRow
              key={workspace.id}
              workspace={workspace}
              sessions={repositories.filter((node) => node.parentId === workspace.id)}
              expandedIds={expandedIds}
              currentWorkspaceId={currentWorkspaceId}
              sessionId={sessionId}
              isPinned={pinnedIds.includes(workspace.id)}
              onToggleExpanded={onToggleExpanded}
              onSelectSession={onSelectSession}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      {/* 3. Codex "最近" (Recent) Quick Section (if multiple sessions exist) */}
      {allSessions.length > 2 && grouping === "project" ? (
        <div className="mt-2 flex flex-col gap-1 border-t border-separator-border/40 pt-2">
          <span className="px-2 text-caption-2-medium uppercase tracking-wider text-text-tertiary font-semibold">
            {t("chat.recent")}
          </span>
          {allSessions.slice(0, 3).map((session) => (
            <button
              key={`recent-${session.id}`}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cx(
                "flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1 text-left transition-colors cursor-pointer",
                session.id === sessionId
                  ? "bg-background-tertiary-default text-text-primary font-medium"
                  : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              )}
            >
              <span className="min-w-0 flex-1 truncate text-caption-1-medium">
                {session.name}
              </span>
              {session.id === sessionId && running ? (
                <DotMatrixLoader variant="wave" className="shrink-0" />
              ) : (
                <span className="shrink-0 text-caption-2-medium text-text-tertiary">
                  {formatTime(session.updatedAt)}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {/* 4. Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
