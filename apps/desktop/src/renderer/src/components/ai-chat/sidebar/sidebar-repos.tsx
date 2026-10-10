/**
 * 侧栏项目与会话列表：按项目 / 单列表 / 状态组。按项目不复用「最近」。
 */
import { useMemo, useState } from "react"
import { isSessionRowActive, type SessionRowClick } from "@renderer/components/ai-chat/sidebar/session-row-highlight"
import { RiAddLine, RiFolder6Line } from "@remixicon/react"
import { SidebarActiveSessions } from "@renderer/components/ai-chat/sidebar/sidebar-active-sessions"
import { SidebarOrganizeMenu } from "@renderer/components/ai-chat/sidebar/sidebar-organize-menu"
import { SidebarSessionRow } from "@renderer/components/ai-chat/sidebar/sidebar-session-row"
import { SidebarWorkspaceRow } from "@renderer/components/ai-chat/sidebar/sidebar-workspace-row"
import { SidebarStatusGroups } from "@renderer/components/ai-chat/sidebar/sidebar-status-groups"
import {
  orphanSessions,
  sessionsForWorkspace,
  workspaceIdsOf
} from "@renderer/components/ai-chat/sidebar/project-session-groups"
import { sidebarListHeadingKey } from "@renderer/components/ai-chat/sidebar/sidebar-heading"
import { sortSessions } from "@renderer/components/ai-chat/sidebar/sort-sessions"
import { CreateProjectDialog } from "@renderer/components/workspace/create-project-dialog"
import { requestArchiveSession } from "@renderer/hooks/deny-then-archive"
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
  const [clickedRow, setClickedRow] = useState<SessionRowClick | null>(null)
  const t = useT()
  const currentWorkspaceId = useChatStore((state) => state.workspaceId)
  const grouping = useChatStore((state) => state.sidebarGrouping)
  const pinnedIds = useChatStore((state) => state.pinnedWorkspaceIds)
  const sortOrder = useChatStore((state) => state.sessionSortOrder)
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
    return sortSessions(list, { sortOrder })
  }, [repositories, sortOrder])
  const looseSessions = useMemo(
    () => orphanSessions(allSessions, workspaceIdsOf(repositories)),
    [allSessions, repositories]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-body-medium font-semibold text-text-primary">
          {t(sidebarListHeadingKey(grouping))}
        </span>
        <div className="flex items-center gap-0.5">
          <SidebarOrganizeMenu />
          <button
            type="button"
            title={t("chat.createProject")}
            onClick={() => setCreateDialogOpen(true)}
            className="flex size-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer"
          >
            <RiAddLine className="size-4" />
          </button>
        </div>
      </div>

      <SidebarActiveSessions
        sessions={allSessions}
        sessionId={sessionId}
        clickedRow={clickedRow}
        onSelectSession={(id) => {
          setClickedRow({ id, surface: "active" })
          onSelectSession(id)
        }}
        formatTime={formatTime}
      />

      {workspaces.length === 0 ? (
        <EmptyProjects onAdd={() => setCreateDialogOpen(true)} />
      ) : grouping === "status" ? (
        <SidebarStatusGroups
          sessions={allSessions}
          sessionId={sessionId}
          onSelectSession={(id) => {
            setClickedRow({ id, surface: "tree" })
            onSelectSession(id)
          }}
          formatTime={formatTime}
        />
      ) : grouping === "flat" ? (
        <div className="flex flex-col gap-0.5">
          {allSessions.map((session) => (
            <SidebarSessionRow
              key={session.id}
              sessionId={session.id}
              name={session.name}
              active={isSessionRowActive(session.id, sessionId, clickedRow, "tree")}
              updatedAt={session.updatedAt}
              formatTime={formatTime}
              flagged={session.flagged}
              workflowStatus={session.workflowStatus}
              className="rounded-xl"
              nameClassName="text-body-medium"
              surface="tree"
              onSelect={() => {
                setClickedRow({ id: session.id, surface: "tree" })
                onSelectSession(session.id)
              }}
            />
          ))}
        </div>
      ) : (
        <ProjectSessionTree
          workspaces={workspaces}
          allSessions={allSessions}
          looseSessions={looseSessions}
          expandedIds={expandedIds}
          currentWorkspaceId={currentWorkspaceId}
          sessionId={sessionId}
          pinnedIds={pinnedIds}
          onToggleExpanded={onToggleExpanded}
          onSelectSession={(id) => {
            setClickedRow({ id, surface: "tree" })
            onSelectSession(id)
          }}
          isRowActive={(id) => isSessionRowActive(id, sessionId, clickedRow, "tree")}
          formatTime={formatTime}
        />
      )}

      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}

function EmptyProjects({ onAdd }: { onAdd: () => void }) {
  const t = useT()
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-button-default p-4 text-center">
      <RiFolder6Line className="size-6 text-text-tertiary" />
      <p className="text-caption-1-medium text-text-secondary">{t("chat.noProjects")}</p>
      <button
        type="button"
        onClick={onAdd}
        className="text-caption-2-medium text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
      >
        {t("chat.addProject")}
      </button>
    </div>
  )
}

function ProjectSessionTree({
  workspaces,
  allSessions,
  looseSessions,
  expandedIds,
  currentWorkspaceId,
  sessionId,
  pinnedIds,
  onToggleExpanded,
  onSelectSession,
  isRowActive,
  formatTime
}: {
  workspaces: RepositoryNode[]
  allSessions: RepositoryNode[]
  looseSessions: RepositoryNode[]
  expandedIds: string[]
  currentWorkspaceId: string | null
  sessionId: string | null
  pinnedIds: string[]
  onToggleExpanded: (id: string) => void
  onSelectSession: (id: string) => void
  isRowActive: (id: string) => boolean
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1">
      {workspaces.map((workspace) => (
        <SidebarWorkspaceRow
          key={workspace.id}
          workspace={workspace}
          sessions={sessionsForWorkspace(allSessions, workspace.id)}
          expandedIds={expandedIds}
          currentWorkspaceId={currentWorkspaceId}
          sessionId={sessionId}
          isPinned={pinnedIds.includes(workspace.id)}
          onToggleExpanded={onToggleExpanded}
          onSelectSession={onSelectSession}
          isRowActive={isRowActive}
          formatTime={formatTime}
        />
      ))}
      {looseSessions.length > 0 ? (
        <div
          data-testid="other-chats-group"
          className="mt-2 flex flex-col gap-1 border-t border-separator-border/40 pt-2"
        >
          <span className="px-2 text-caption-2-medium font-semibold text-text-tertiary">
            {t("chat.otherChats")}
          </span>
          {looseSessions.map((session) => (
            <SidebarSessionRow
              key={session.id}
              sessionId={session.id}
              name={session.name}
              active={isRowActive(session.id)}
              updatedAt={session.updatedAt}
              formatTime={formatTime}
              flagged={session.flagged}
              workflowStatus={session.workflowStatus}
              className="rounded-xl"
              surface="tree"
              onSelect={() => onSelectSession(session.id)}
              onArchive={() => requestArchiveSession(session.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
