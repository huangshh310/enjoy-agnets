/**
 * 侧栏按工作流状态分组视图 (Status Grouping View)。
 * 依次呈现：旗标置顶、进行中、待审查、待办、已完成、其它。
 */
import { useMemo } from "react"
import {
  RiBookmarkFill,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInboxLine,
  RiPlayCircleLine,
  RiTimeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"
import { useChatStore } from "@renderer/stores/chat-store"
import { SidebarSessionRow } from "./sidebar-session-row"

export function SidebarStatusGroups({
  sessions,
  sessionId,
  onSelectSession,
  formatTime
}: {
  sessions: RepositoryNode[]
  sessionId: string | null
  onSelectSession: (id: string) => void
  formatTime: (timestamp: number) => string
}) {
  const t = useT()
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)

  const groups = useMemo(() => {
    const flagged = sessions.filter((s) => s.flagged)
    const inProgress = sessions.filter((s) => !s.flagged && s.workflowStatus === "in_progress")
    const needsReview = sessions.filter((s) => !s.flagged && s.workflowStatus === "needs_review")
    const todo = sessions.filter((s) => !s.flagged && s.workflowStatus === "todo")
    const done = sessions.filter((s) => !s.flagged && s.workflowStatus === "done")
    const none = sessions.filter((s) => !s.flagged && !s.workflowStatus)

    return [
      { key: "flagged", label: t("chat.sessionFlaggedGroup"), icon: RiBookmarkFill, color: "text-accent-600 dark:text-accent-400", items: flagged },
      { key: "in_progress", label: t("chat.statusInProgress"), icon: RiPlayCircleLine, color: "text-accent-600 dark:text-accent-400", items: inProgress },
      { key: "needs_review", label: t("chat.statusNeedsReview"), icon: RiErrorWarningLine, color: "text-text-warning-primary", items: needsReview },
      { key: "todo", label: t("chat.statusTodo"), icon: RiTimeLine, color: "text-text-tertiary", items: todo },
      { key: "done", label: t("chat.statusDone"), icon: RiCheckboxCircleLine, color: "text-text-success-primary", items: done },
      { key: "none", label: t("chat.statusNone"), icon: RiInboxLine, color: "text-text-tertiary", items: none }
    ].filter((g) => g.items.length > 0)
  }, [sessions, t])

  if (groups.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-caption-2-medium text-text-tertiary">
        {t("chat.noChats")}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const Icon = group.icon
        return (
          <div key={group.key} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-2 py-1 text-caption-2-medium text-text-tertiary font-semibold">
              <div className="flex items-center gap-1.5">
                <Icon className={cx("size-3.5", group.color)} />
                <span>{group.label}</span>
              </div>
              <span className="rounded-full bg-background-tertiary-default px-1.5 py-0.2 text-caption-2-medium text-text-tertiary">
                {group.items.length}
              </span>
            </div>
            {group.items.map((session) => (
              <SidebarSessionRow
                key={session.id}
                sessionId={session.id}
                name={session.name}
                active={session.id === sessionId}
                updatedAt={session.updatedAt}
                formatTime={formatTime}
                flagged={session.flagged}
                workflowStatus={session.workflowStatus}
                changesSummary={
                  session.id === sessionId && (additions > 0 || deletions > 0)
                    ? { additions, deletions }
                    : null
                }
                className="rounded-xl"
                nameClassName="text-body-medium"
                onSelect={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
