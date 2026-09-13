/**
 * 会话行操作菜单：旗标置顶、状态切换 (Todo / In Progress / Needs Review / Done)、重命名与归档。
 */
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInboxArchiveLine,
  RiMoreFill,
  RiPlayCircleLine,
  RiTimeLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  WORKFLOW_STATUS_LIST,
  WORKFLOW_STATUSES,
  type SessionWorkflowStatus
} from "./session-workflow"

export type SessionRowMenuProps = {
  sessionId: string
  flagged?: boolean
  workflowStatus?: SessionWorkflowStatus | null
  onArchive?: () => void
  className?: string
}

export function SessionRowMenu({
  sessionId,
  flagged = false,
  workflowStatus = null,
  onArchive,
  className
}: SessionRowMenuProps) {
  const t = useT()
  const patchSessionNode = useChatStore((state) => state.patchSessionNode)

  const handleToggleFlag = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !flagged
    patchSessionNode(sessionId, { flagged: next })
    if (hasIde()) {
      try {
        await getIde().session.patch({ id: sessionId, flagged: next })
      } catch (err) {
        console.error("Failed to patch session flag:", err)
        patchSessionNode(sessionId, { flagged })
      }
    }
  }

  const handleStatusChange = async (val: string) => {
    const next = val === "none" ? null : (val as SessionWorkflowStatus)
    patchSessionNode(sessionId, { workflowStatus: next })
    if (hasIde()) {
      try {
        await getIde().session.patch({ id: sessionId, workflowStatus: next })
      } catch (err) {
        console.error("Failed to patch session status:", err)
        patchSessionNode(sessionId, { workflowStatus })
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Session actions"
          className={cx(
            "hidden size-5.5 shrink-0 items-center justify-center rounded-md text-text-tertiary",
            "hover:bg-background-primary-default hover:text-text-primary group-hover/session:flex",
            className
          )}
        >
          <RiMoreFill className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-48 rounded-xl bg-background-primary-default p-1 shadow-card border border-border-button-default"
      >
        {/* 1. 旗标置顶 */}
        <DropdownMenuItem onClick={handleToggleFlag} className="cursor-pointer">
          {flagged ? (
            <>
              <RiBookmarkFill className="mr-2 size-4 text-accent-600 dark:text-accent-400" />
              <span>{t("chat.unflagSession")}</span>
            </>
          ) : (
            <>
              <RiBookmarkLine className="mr-2 size-4 text-text-tertiary" />
              <span>{t("chat.flagSession")}</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 2. 工作流状态 */}
        <DropdownMenuLabel className="px-2 py-1 text-caption-2-medium text-text-tertiary">
          {t("chat.setStatus")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={workflowStatus ?? "none"}
          onValueChange={handleStatusChange}
        >
          <DropdownMenuRadioItem value="none" className="cursor-pointer text-body-medium">
            <span>{t("chat.statusNone")}</span>
          </DropdownMenuRadioItem>
          {WORKFLOW_STATUS_LIST.map((st) => {
            const meta = WORKFLOW_STATUSES[st]
            return (
              <DropdownMenuRadioItem key={st} value={st} className="cursor-pointer text-body-medium">
                <StatusIcon status={st} className={cx("mr-2 size-3.5", meta.colorClass)} />
                <span>{t(meta.labelKey as any)}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>

        {onArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onArchive()
              }}
              className="cursor-pointer text-text-secondary hover:text-text-primary"
            >
              <RiInboxArchiveLine className="mr-2 size-4" />
              <span>{t("chat.archiveSession")}</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusIcon({ status, className }: { status: SessionWorkflowStatus; className?: string }) {
  if (status === "in_progress") return <RiPlayCircleLine className={className} />
  if (status === "needs_review") return <RiErrorWarningLine className={className} />
  if (status === "done") return <RiCheckboxCircleLine className={className} />
  return <RiTimeLine className={className} />
}
