/**
 * 会话行操作菜单：星标、状态切换、归档。
 * 触发钮必须始终占位：`hidden` 在开菜单后失悬停会丢掉 bbox，Radix 会把菜单钉到窗口左上。
 */
import { useRef, useState } from "react"
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiGitPullRequestLine,
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
  applySessionMenuCloseFocus,
  SESSION_MENU_COLLISION,
  sessionMenuAlign,
  sessionMenuMaxHeight,
  type SessionMenuAlign
} from "./session-menu-placement"
import {
  AttachPrDialog,
  BabysitStartConfirmDialog,
  BabysitStopConfirmDialog,
  ConnectGithubCard,
  useAttachedPrs,
  usePrBabysit
} from "@renderer/components/ai-chat/pr-flow"
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
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<SessionMenuAlign>("start")
  const [maxHeight, setMaxHeight] = useState<number>()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const openedByPointer = useRef(false)
  const patchSessionNode = useChatStore((state) => state.patchSessionNode)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [attachOpen, setAttachOpen] = useState(false)
  const [babysitStartOpen, setBabysitStartOpen] = useState(false)
  const [babysitStopOpen, setBabysitStopOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [babysitBusy, setBabysitBusy] = useState(false)
  const [babysitError, setBabysitError] = useState<string | null>(null)
  const { primaryItem } = useAttachedPrs(sessionId)
  const { isWatching, start: startBabysit, stop: stopBabysit } = usePrBabysit(sessionId)
  const watchingPrimary = primaryItem ? isWatching(primaryItem.number) : false

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        const nextAlign = sessionMenuAlign(rect, window.innerHeight)
        setAlign(nextAlign)
        setMaxHeight(sessionMenuMaxHeight(rect, window.innerHeight, SESSION_MENU_COLLISION, nextAlign))
      }
    }
    setOpen(next)
  }

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
    <>
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          data-testid="session-row-menu"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={() => {
            openedByPointer.current = true
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return
            openedByPointer.current = false
            delete triggerRef.current?.dataset.pointerReturn
          }}
          onBlur={() => {
            delete triggerRef.current?.dataset.pointerReturn
          }}
          aria-label={t("chat.sessionActions")}
          className={cx(
            "flex size-5.5 shrink-0 items-center justify-center rounded-md text-text-secondary focus-ring",
            "hover:bg-background-primary-default hover:text-text-primary",
            "data-[pointer-return]:ring-0 data-[pointer-return]:focus-visible:ring-0",
            open ? "opacity-100" : "opacity-0 group-hover/session:opacity-100 group-focus-within/session:opacity-100",
            className
          )}
        >
          <RiMoreFill className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-testid="session-row-menu-content"
        align={align}
        side="right"
        sideOffset={6}
        avoidCollisions
        collisionPadding={SESSION_MENU_COLLISION}
        onCloseAutoFocus={(event) => {
          applySessionMenuCloseFocus(event, openedByPointer.current, triggerRef.current)
          openedByPointer.current = false
        }}
        style={maxHeight ? { maxHeight } : undefined}
        className="w-48 overflow-y-auto rounded-xl bg-background-primary-default p-1 shadow-card border border-border-button-default"
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

        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="session-row-menu-attach-pr"
          onClick={(e) => {
            e.stopPropagation()
            setAttachOpen(true)
          }}
          className="cursor-pointer"
        >
          <RiGitPullRequestLine className="mr-2 size-4" />
          <span>{t("chat.prAttachTitle")}</span>
        </DropdownMenuItem>

        {primaryItem ? (
          <DropdownMenuItem
            data-testid="session-row-menu-babysit"
            onClick={(e) => {
              e.stopPropagation()
              setBabysitError(null)
              if (watchingPrimary) setBabysitStopOpen(true)
              else setBabysitStartOpen(true)
              setOpen(false)
            }}
            className="cursor-pointer"
          >
            <RiGitPullRequestLine className="mr-2 size-4" />
            <span>
              {watchingPrimary ? t("chat.prBabysitStopAction") : t("chat.prBabysitStartTitle")}
            </span>
          </DropdownMenuItem>
        ) : null}

        {onArchive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="session-row-menu-archive"
              onClick={(e) => {
                e.stopPropagation()
                onArchive()
              }}
              className="cursor-pointer"
            >
              <RiInboxArchiveLine className="mr-2 size-4" />
              <span>{t("chat.archiveSession")}</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
      <AttachPrDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        sessionId={sessionId}
        workspaceId={workspaceId}
      />
      <BabysitStartConfirmDialog
        open={babysitStartOpen}
        onOpenChange={setBabysitStartOpen}
        busy={babysitBusy}
        error={babysitError}
        onConfirm={async () => {
          if (!workspaceId || !primaryItem) return
          setBabysitBusy(true)
          setBabysitError(null)
          try {
            const res = await startBabysit({
              workspaceId,
              number: primaryItem.number,
              url: primaryItem.url
            })
            if (!res.ok) {
              if (res.reason === "not-authed") {
                setBabysitStartOpen(false)
                setConnectOpen(true)
                return
              }
              setBabysitError(res.message || t("chat.prBabysitStartFailed"))
              return
            }
            setBabysitStartOpen(false)
          } finally {
            setBabysitBusy(false)
          }
        }}
      />
      <BabysitStopConfirmDialog
        open={babysitStopOpen}
        onOpenChange={setBabysitStopOpen}
        busy={babysitBusy}
        onConfirm={async () => {
          if (!primaryItem) return
          setBabysitBusy(true)
          try {
            await stopBabysit(primaryItem.number)
            setBabysitStopOpen(false)
          } finally {
            setBabysitBusy(false)
          }
        }}
      />
      <ConnectGithubCard open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  )
}

function StatusIcon({ status, className }: { status: SessionWorkflowStatus; className?: string }) {
  if (status === "in_progress") return <RiPlayCircleLine className={className} />
  if (status === "needs_review") return <RiErrorWarningLine className={className} />
  if (status === "done") return <RiCheckboxCircleLine className={className} />
  return <RiTimeLine className={className} />
}
