/**
 * 侧栏单个项目行：点击切换展开/收缩，展开其他项目时才切换当前工作区。
 */
import { RiAddLine, RiFolder6Line, RiInboxArchiveLine, RiPushpin2Fill } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { ProjectPopover } from "@renderer/components/ai-chat/sidebar/project-popover"
import {
  isWorkspaceRowExpanded,
  shouldSwitchWorkspaceOnFolderClick
} from "@renderer/components/ai-chat/sidebar/sidebar-expand"
import { archiveCurrentSession } from "@renderer/hooks/workspace-lifecycle"
import {
  createAndOpenSession,
  loadWorkspace
} from "@renderer/hooks/use-agent-session"
import { DotMatrixLoader } from "@/components/ui/dot-matrix-loader"
import { useChatStore, type RepositoryNode } from "@renderer/stores/chat-store"
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
  formatTime
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
          ? "bg-background-tertiary-default/70 text-text-primary font-medium"
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
        <span className="min-w-0 flex-1 truncate text-body-medium">{workspace.name}</span>
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
  formatTime
}: {
  workspace: RepositoryNode
  sessions: RepositoryNode[]
  currentWorkspaceId: string | null
  sessionId: string | null
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  const running = useChatStore((state) => state.running)
  const t = useT()

  return (
    <div className="relative my-0.5 ml-4 flex flex-col gap-0.5 border-l border-separator-border/60 pl-2">
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
        sessions.map((session) => (
          <div
            key={session.id}
            className={cx(
              "group/session flex w-full items-center gap-1 rounded-lg pr-1",
              session.id === sessionId
                ? "bg-background-tertiary-default font-medium text-text-primary shadow-2xs"
                : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (workspace.id !== currentWorkspaceId) {
                  void switchWorkspace(workspace).then(() => onSelectSession(session.id))
                  return
                }
                onSelectSession(session.id)
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-1.5 rounded-lg px-2 py-1 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-caption-1-medium">{session.name}</span>
              {session.id === sessionId && running ? (
                <DotMatrixLoader variant="wave" className="shrink-0 group-hover/session:hidden" />
              ) : (
                <span className="shrink-0 text-caption-2-medium text-text-tertiary group-hover/session:hidden">
                  {formatTime(session.updatedAt)}
                </span>
              )}
            </button>
            <button
              type="button"
              title={t("chat.archiveSession")}
              onClick={() => void archiveCurrentSession(session.id)}
              className="hidden size-5.5 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-background-primary-default hover:text-text-primary group-hover/session:flex"
            >
              <RiInboxArchiveLine className="size-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function switchWorkspace(workspace: RepositoryNode) {
  return loadWorkspace({
    id: workspace.id,
    name: workspace.name,
    rootPath: workspace.rootPath || ""
  })
}
