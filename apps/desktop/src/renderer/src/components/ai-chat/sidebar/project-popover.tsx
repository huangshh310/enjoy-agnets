/**
 * 项目悬浮信息卡片与操作面板 (Project Popover):
 * 展示任务数、完整路径与快捷操作。Git 分支未接线，不假装已接上。
 */
import { useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiClipboardLine,
  RiFolder6Line,
  RiChat3Line,
  RiDeleteBinLine,
  RiFolderOpenLine,
  RiMoreFill,
  RiPushpin2Fill,
  RiPushpin2Line
} from "@remixicon/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { createAndOpenSession, loadWorkspace } from "@renderer/hooks/use-agent-session"
import { removeProject } from "@renderer/hooks/workspace-lifecycle"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"


export function ProjectPopover({
  workspace,
  sessionCount = 0,
  isActive = false,
  children
}: {
  workspace: { id: string; name: string; rootPath?: string; isPinned?: boolean }
  sessionCount?: number
  isActive?: boolean
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const t = useT()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isPinned = useChatStore((state) => state.pinnedWorkspaceIds.includes(workspace.id))
  const togglePin = useChatStore((state) => state.togglePinWorkspace)

  function handleCopyPath(e: React.MouseEvent) {
    e.stopPropagation()
    if (!workspace.rootPath) return
    void navigator.clipboard.writeText(workspace.rootPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNewChat(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    await loadWorkspace({ id: workspace.id, name: workspace.name, rootPath: workspace.rootPath || "" })
    await createAndOpenSession(workspace.id, t("chat.newAgent"))
  }

  async function handleSwitchWorkspace(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    await loadWorkspace({ id: workspace.id, name: workspace.name, rootPath: workspace.rootPath || "" })
  }

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            aria-label={t("chat.projectActions")}
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-background-tertiary-default hover:text-text-primary transition-all cursor-pointer"
          >
            <RiMoreFill className="size-4" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-72 p-3.5 rounded-2xl bg-background-primary-default shadow-card border border-border-button-default"
      >
        <div className="flex flex-col gap-2.5">
          {/* Header with Name and Pin */}
          <div className="flex items-center justify-between gap-2 border-b border-separator-border/60 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <RiFolder6Line className="size-4.5 text-accent-500 shrink-0" />
              <span className="truncate text-body-medium font-semibold text-text-primary">
                {workspace.name}
              </span>
            </div>

            <button
              type="button"
              title={isPinned ? t("chat.unpin") : t("chat.pinProject")}
              onClick={(e) => {
                e.stopPropagation()
                togglePin(workspace.id)
              }}
              className={cx(
                "flex size-6 items-center justify-center rounded-md transition-colors cursor-pointer",
                isPinned
                  ? "text-accent-500 hover:bg-accent-500/10"
                  : "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
              )}
            >
              {isPinned ? (
                <RiPushpin2Fill className="size-3.5" />
              ) : (
                <RiPushpin2Line className="size-3.5" />
              )}
            </button>
          </div>

          {/* Metadata Section */}
          <div className="flex flex-col gap-1.5 text-caption-1-medium text-text-secondary">
            {/* Task count */}
            <div className="flex items-center gap-2">
              <RiChat3Line className="size-3.5 text-text-tertiary" />
              <span>{sessionCount > 0 ? t("chat.taskCount", { count: sessionCount }) : t("chat.noTasks")}</span>
            </div>

            {/* Path */}
            {workspace.rootPath ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background-secondary-default p-1.5 font-mono text-[10px] text-text-tertiary">
                <span className="truncate">{workspace.rootPath}</span>
                <button
                  type="button"
                  title={t("chat.copyPath")}
                  onClick={handleCopyPath}
                  className="shrink-0 text-text-tertiary hover:text-text-primary"
                >
                  {copied ? (
                    <RiCheckLine className="size-3 text-emerald-500" />
                  ) : (
                    <RiClipboardLine className="size-3" />
                  )}
                </button>
              </div>
            ) : null}
          </div>

          {/* Quick Actions List */}
          <div className="flex flex-col gap-1 border-t border-separator-border/60 pt-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body-medium text-text-primary hover:bg-background-secondary-hover transition-colors cursor-pointer"
            >
              <RiAddLine className="size-4 text-emerald-500" />
              <span>{t("chat.newChat")}</span>
            </button>

            {!isActive ? (
              <button
                type="button"
                onClick={handleSwitchWorkspace}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body-medium text-text-primary hover:bg-background-secondary-hover transition-colors cursor-pointer"
              >
                <RiFolderOpenLine className="size-4 text-accent-500" />
                <span>{t("chat.setCurrentWorkspace")}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                setConfirmOpen(true)
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body-medium text-text-error-primary hover:bg-background-secondary-hover"
            >
              <RiDeleteBinLine className="size-4" />
              <span>{t("chat.removeProject")}</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <ConfirmDialog
      open={confirmOpen}
      title={t("chat.removeProject")}
      description={t("chat.removeProjectHint", { name: workspace.name })}
      confirmLabel={t("chat.remove")}
      destructive
      cancelLabel={t("common.cancel")}
      onOpenChange={setConfirmOpen}
      onConfirm={() => void removeProject(workspace.id)}
    />
    </>
  )
}
