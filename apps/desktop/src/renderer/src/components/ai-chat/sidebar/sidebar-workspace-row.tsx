/**
 * 侧栏单个项目行：点击切换展开/收缩，展开其他项目时才切换当前工作区。
 */
import { RiAddLine, RiFolder6Line, RiPushpin2Fill } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { ProjectPopover } from "@renderer/components/ai-chat/sidebar/project-popover"
import {
  isWorkspaceRowExpanded,
  shouldSwitchWorkspaceOnFolderClick
} from "@renderer/components/ai-chat/sidebar/sidebar-expand"
import { SidebarSessionRow } from "@renderer/components/ai-chat/sidebar/sidebar-session-row"
import { requestArchiveSession } from "@renderer/hooks/deny-then-archive"
import {
  createAndOpenSession,
  loadWorkspace
} from "@renderer/hooks/use-agent-session"
import { workspaceRowFromNode } from "@renderer/hooks/workspace-row"
import { type RepositoryNode, useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function SidebarWorkspaceRow({
  workspace,
  sessions,
  expandedIds,
  currentWorkspaceId,
  sessionId,
  isPinned,
  onToggleExpanded,
  onSelectSession,
  formatTime,
  isRowActive
}: {
  workspace: RepositoryNode
  sessions: RepositoryNode[]
  expandedIds: string[]
  currentWorkspaceId: string | null
  sessionId: string | null
  isPinned: boolean
  onToggleExpanded: (id: string) => void
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
  isRowActive?: (id: string) => boolean
}) {
  const isExpanded = isWorkspaceRowExpanded(workspace.id, expandedIds)
  const isActive = workspace.id === currentWorkspaceId

  function handleFolderClick() {
    const wasExpanded = isExpanded
    onToggleExpanded(workspace.id)
    if (
      shouldSwitchWorkspaceOnFolderClick(workspace.id, currentWorkspaceId, wasExpanded)
    ) {
      void switchWorkspace(workspace)
    }
  }

  return (
    <div className="flex flex-col">
      <FolderHeader
        workspace={workspace}
        isActive={isActive}
        isPinned={isPinned}
        sessionCount={sessions.length}
        onFolderClick={handleFolderClick}
      />
      {isExpanded ? (
        <SessionList
          workspace={workspace}
          sessions={sessions}
          currentWorkspaceId={currentWorkspaceId}
          sessionId={sessionId}
          onSelectSession={onSelectSession}
          isRowActive={isRowActive}
          formatTime={formatTime}
        />
      ) : null}
    </div>
  )
}

function FolderHeader({
  workspace,
  isActive,
  isPinned,
  sessionCount,
  onFolderClick
}: {
  workspace: RepositoryNode
  isActive: boolean
  isPinned: boolean
  sessionCount: number
  onFolderClick: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        "group flex items-center justify-between rounded-xl px-2 py-1.5 transition-colors cursor-pointer",
        isActive
          ? "text-text-primary font-medium"
          : "hover:bg-background-secondary-hover text-text-secondary"
      )}
      onClick={onFolderClick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <RiFolder6Line
          className={cx(
            "size-4.5 shrink-0 transition-colors",
            isActive ? "text-accent-500" : "text-foreground-icon-secondary"
          )}
        />
        <span
          className="min-w-0 flex-1 truncate text-body-medium"
          title={remoteTitle(workspace)}
        >
          {workspace.name}
        </span>
        {workspace.locationKind === "ssh" ? (
          <span className="shrink-0 rounded bg-background-tertiary-default px-1 font-mono text-caption-2-medium text-text-tertiary">
            {t("settings.workspace.remoteFootnote")}
          </span>
        ) : null}
        {isPinned ? <RiPushpin2Fill className="size-3 shrink-0 text-accent-500" /> : null}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          title={t("chat.newChat")}
          onClick={(event) => {
            event.stopPropagation()
            void switchWorkspace(workspace).then(() =>
              createAndOpenSession(workspace.id, t("chat.newAgent"))
            )
          }}
          className="flex size-5.5 items-center justify-center rounded-md text-text-tertiary shadow-2xs hover:bg-background-primary-default hover:text-text-primary"
        >
          <RiAddLine className="size-3.5 text-accent-500" />
        </button>
        <ProjectPopover workspace={workspace} sessionCount={sessionCount} isActive={isActive} />
      </div>
    </div>
  )
}

function SessionList({
  workspace,
  sessions,
  currentWorkspaceId,
  sessionId,
  onSelectSession,
  isRowActive,
  formatTime
}: {
  workspace: RepositoryNode
  sessions: RepositoryNode[]
  currentWorkspaceId: string | null
  sessionId: string | null
  onSelectSession: (id: string) => void
  isRowActive?: (id: string) => boolean
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)

  return (
    <div className="relative my-0.5 ml-2 flex flex-col gap-0.5 border-l border-separator-border/60 pl-1.5">
      {sessions.length === 0 ? (
        <div className="flex items-center justify-between px-2 py-1 text-caption-2-medium text-text-tertiary">
          <span>{t("chat.noChats")}</span>
          <button
            type="button"
            onClick={() => {
              void switchWorkspace(workspace).then(() =>
                createAndOpenSession(workspace.id, t("chat.newAgent"))
              )
            }}
            className="cursor-pointer text-accent-600 hover:underline"
          >
            {t("chat.newChatPlus")}
          </button>
        </div>
      ) : (
        [...sessions]
          .sort((a, b) => {
            const aFlag = a.flagged ? 1 : 0
            const bFlag = b.flagged ? 1 : 0
            if (aFlag !== bFlag) return bFlag - aFlag
            return b.updatedAt - a.updatedAt
          })
          .map((session) => (
            <SidebarSessionRow
              key={session.id}
              sessionId={session.id}
              name={session.name}
              active={isRowActive ? isRowActive(session.id) : session.id === sessionId}
              surface="tree"
              updatedAt={session.updatedAt}
              formatTime={formatTime}
              flagged={session.flagged}
              workflowStatus={session.workflowStatus}
              changesSummary={
                session.id === sessionId && (additions > 0 || deletions > 0)
                  ? { additions, deletions }
                  : null
              }
              className="rounded-lg"
              onSelect={() => {
                if (workspace.id !== currentWorkspaceId) {
                  void switchWorkspace(workspace).then(() => onSelectSession(session.id))
                  return
                }
                onSelectSession(session.id)
              }}
              onArchive={() => requestArchiveSession(session.id)}
            />
          ))
      )}
    </div>
  )
}

function remoteTitle(workspace: RepositoryNode): string | undefined {
  if (workspace.locationKind !== "ssh") return workspace.rootPath
  const user = workspace.sshUser
  const host = workspace.sshHost
  const path = workspace.remotePath
  if (user && host && path) return `${user}@${host}:${path}`
  return workspace.rootPath
}

function switchWorkspace(workspace: RepositoryNode) {
  return loadWorkspace(workspaceRowFromNode(workspace))
}
