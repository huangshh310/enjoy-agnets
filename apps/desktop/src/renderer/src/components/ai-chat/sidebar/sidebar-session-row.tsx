/**
 * 侧栏会话行：左侧 Agent 标、旗标与工作流状态徽章。等你（审批）优先于运行灯；右侧操作菜单。
 */
import { RiBookmarkFill } from "@remixicon/react"
import { LoadingStateGlyph } from "@/components/ai-elements/loading-state"
import { cx } from "@/utils/cx"
import { SessionAgentMark } from "@renderer/components/ai-chat/sidebar/session-agent-mark"
import { SessionRowMenu } from "./session-row-menu"
import { getWorkflowStatusMeta } from "./session-workflow"
import { WorkflowStatusGlyph } from "./workflow-status-glyph"
import { useT } from "@renderer/i18n"
import { displaySessionTitle } from "@renderer/lib/session-title"
import type { SidebarSessionRowProps } from "./sidebar-session-row.types"
import { useSessionActivity } from "./use-session-activity"

export function SidebarSessionRow({
  sessionId,
  name,
  active,
  updatedAt,
  formatTime,
  onSelect,
  onArchive,
  flagged = false,
  workflowStatus = null,
  changesSummary = null,
  className,
  nameClassName = "text-caption-2-medium"
}: SidebarSessionRowProps) {
  const t = useT()
  const activity = useSessionActivity(sessionId)
  const statusMeta = getWorkflowStatusMeta(workflowStatus)
  const label = displaySessionTitle(name, t("chat.newAgent"))

  return (
    <div
      className={cx(
        "group/session flex h-7 w-full items-center gap-1 rounded-md",
        active
          ? "bg-background-secondary-hover text-text-primary"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        title={label}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-left"
      >
        <SessionAgentMark sessionId={sessionId} />
        {flagged ? (
          <span title="Flagged" className="flex shrink-0 items-center">
            <RiBookmarkFill className="size-3 text-accent-600 dark:text-accent-400" />
          </span>
        ) : null}
        {statusMeta ? <WorkflowStatusGlyph status={statusMeta.status} className={statusMeta.colorClass} /> : null}
        <SessionRowIdentity label={label} nameClassName={nameClassName} />
        {changesSummary && (changesSummary.additions > 0 || changesSummary.deletions > 0) ? (
          <span
            title="工作区未提交"
            className="flex shrink-0 items-center gap-0.5 font-mono text-caption-2-regular tabular-nums"
          >
            {changesSummary.additions > 0 ? (
              <span className="text-state-success-text">+{changesSummary.additions}</span>
            ) : null}
            {changesSummary.deletions > 0 ? (
              <span className="text-text-error-primary">-{changesSummary.deletions}</span>
            ) : null}
          </span>
        ) : null}
        <SessionRowMeta
          running={activity.running}
          waitingReview={activity.waitingReview}
          updatedAt={updatedAt}
          formatTime={formatTime}
          hideOnHover={true}
        />
      </button>
      <SessionRowMenu
        sessionId={sessionId}
        flagged={flagged}
        workflowStatus={workflowStatus}
        onArchive={onArchive}
        className="mr-1"
      />
    </div>
  )
}

/** 主行只写会话题。引擎身份走左侧 SessionAgentMark，不要把品牌/供应商名当会话名。 */
function SessionRowIdentity({
  label,
  nameClassName
}: {
  label: string
  nameClassName?: string
}) {
  return (
    <span className={cx("min-w-0 flex-1 truncate", nameClassName)} title={label}>
      {label}
    </span>
  )
}

function SessionRowMeta({
  running,
  waitingReview,
  updatedAt,
  formatTime,
  hideOnHover
}: {
  running: boolean
  waitingReview: boolean
  updatedAt: number
  formatTime: (timestamp: number) => string
  hideOnHover: boolean
}) {
  const hide = hideOnHover ? "group-hover/session:hidden" : undefined
  if (waitingReview) {
    return (
      <span
        className={cx("size-2 shrink-0 rounded-full bg-text-error-primary", hide)}
        aria-label="waiting review"
      />
    )
  }
  if (running) return <LoadingStateGlyph variant="drive" className={cx("shrink-0", hide)} />
  return <span className={cx("shrink-0 text-caption-2-regular text-text-secondary", hide)}>{formatTime(updatedAt)}</span>
}
