/**
 * 侧栏仓库树：工作区根 + 会话叶子。
 */
import { RiFolder6Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { RepositoryNode } from "@renderer/stores/chat-store"

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
  const roots = repositories.filter((node) => node.kind === "workspace")
  return (
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
          <WorkspaceBranch
            key={workspace.id}
            workspace={workspace}
            sessions={children}
            expanded={expanded}
            sessionId={sessionId}
            onToggleExpanded={onToggleExpanded}
            onSelectSession={onSelectSession}
            formatTime={formatTime}
          />
        )
      })}
    </div>
  )
}

function WorkspaceBranch({
  workspace,
  sessions,
  expanded,
  sessionId,
  onToggleExpanded,
  onSelectSession,
  formatTime
}: {
  workspace: RepositoryNode
  sessions: RepositoryNode[]
  expanded: boolean
  sessionId: string | null
  onToggleExpanded: (id: string) => void
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => (sessions.length ? onToggleExpanded(workspace.id) : undefined)}
        className="flex w-full items-center gap-2 rounded-2lg p-2 text-left hover:bg-background-secondary-hover"
      >
        <RiFolder6Line className="size-5 text-foreground-icon-secondary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-body-medium text-text-secondary">
          {workspace.name}
        </span>
      </button>
      {expanded ? (
        <div className="relative ml-[26px]">
          {sessions.map((session, index) => (
            <div key={session.id} className="relative">
              <SessionTreeGuide first={index === 0} last={index === sessions.length - 1} />
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
