"use client"

/**
 * 工作区与运行环境中心 (Workspace & Environment Hub)。
 * 替换传统 Web SaaS 虚假团队成员菜单，呈现当前工作区状态、最近工作区无缝切换与全局快捷入口。
 */
import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCheckLine,
  RiFileCopyLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiServerLine,
  RiSettings3Line
} from "@remixicon/react"
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover
} from "react-aria-components"
import { AppMark } from "@renderer/components/brand/app-mark"
import { ChevronUpDownSmall } from "@/components/foundations/icons/chevrons"
import { CreateProjectDialog } from "@renderer/components/workspace/create-project-dialog"
import { loadWorkspace, openFolder, type WorkspaceRow } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-44 opacity-100 blur-0"
      )}
    >
      {children}
    </span>
  )
}

export function WorkspaceDropdownMenu({
  collapsed = false,
  suppressHover = false,
  onHoverSuppressionEnd,
  name = "Enjoy Agents"
}: {
  collapsed?: boolean
  suppressHover?: boolean
  onHoverSuppressionEnd?: () => void
  name?: string
  initials?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootPath = useChatStore((state) => state.workspaceRootPath)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const remoteStatus = useChatStore((state) => state.remoteStatus)

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  function handleCopyPath() {
    if (!workspaceRootPath) return
    void navigator.clipboard.writeText(workspaceRootPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const displayName = workspaceName && workspaceName !== "No workspace" ? workspaceName : name
  const recentWorkspaces = (workspacesQuery.data ?? [])
    .filter((w) => w.id !== workspaceId)
    .slice(0, 4)

  return (
    <>
      <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <AriaButton
          aria-label={displayName}
          onPointerLeave={() => {
            if (suppressHover) onHoverSuppressionEnd?.()
          }}
          className={cx(
            "relative flex min-w-0 cursor-pointer items-center gap-2 rounded-full outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
            "before:pointer-events-none before:absolute before:-inset-x-1.5 before:-inset-y-[5px] before:rounded-full before:border-2 before:border-transparent before:transition-colors before:duration-150",
            !suppressHover && "hover:before:border-border-sidebar-profile-hover",
            collapsed && "w-9 justify-center gap-0 before:-inset-x-[3px]"
          )}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500 dark:bg-accent-500/20">
            <AppMark size={16} />
          </div>
          <Collapsible collapsed={collapsed}>
            <span className="flex items-center gap-1">
              <span className="truncate text-body-medium font-medium text-text-primary max-w-[120px]">
                {displayName}
              </span>
              <ChevronUpDownSmall className="size-4 shrink-0 text-foreground-icon-tertiary" />
            </span>
          </Collapsible>
        </AriaButton>

        <AriaPopover
          placement={isMobile ? "bottom start" : "right top"}
          offset={8}
          className={cx(
            "w-[290px] max-w-[calc(100vw-32px)] origin-top-left overflow-y-auto",
            "rounded-2xl border border-separator-border/80 bg-background-primary-default/98 p-2.5 shadow-dropdown backdrop-blur-xl",
            "transition duration-150 ease-out",
            "data-entering:opacity-0 data-entering:scale-95 data-entering:blur-[2px]",
            "data-exiting:opacity-0 data-exiting:scale-95 data-exiting:blur-[2px]"
          )}
        >
          <AriaDialog aria-label="工作区与运行环境中心" className="flex flex-col outline-none">
            {/* 1. 当前工作区卡片 */}
            <div className="flex flex-col gap-1.5 pb-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-caption-2-semibold font-semibold tracking-wider text-text-tertiary uppercase">
                  当前工作区
                </span>
                {workspaceKind === "ssh" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-state-success-text/10 px-2 py-0.5 text-caption-2-medium font-medium text-state-success-text dark:text-state-success-text">
                    <span
                      className={cx(
                        "size-1.5 rounded-full",
                        remoteStatus === "connected"
                          ? "bg-state-success-base"
                          : "bg-status-yellow-background animate-pulse"
                      )}
                    />
                    SSH 远程
                  </span>
                ) : (
                  <span className="rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-secondary">
                    本机环境
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 rounded-xl border border-border-button-default/70 bg-background-secondary-default/40 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background-primary-default border border-separator-border/60">
                    {workspaceKind === "ssh" ? (
                      <RiServerLine className="size-3.5 text-chart-5 dark:text-chart-5" />
                    ) : (
                      <RiFolderLine className="size-3.5 text-accent-500" />
                    )}
                  </div>
                  <span className="truncate text-caption-1-medium font-semibold text-text-primary">
                    {workspaceName || "未打开工作区"}
                  </span>
                </div>

                {workspaceRootPath ? (
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span
                      className="truncate font-mono text-caption-2-regular text-text-tertiary"
                      title={workspaceRootPath}
                    >
                      {workspaceRootPath}
                    </span>
                    <button
                      type="button"
                      aria-label="复制路径"
                      title="复制路径"
                      onClick={handleCopyPath}
                      className="shrink-0 p-1 rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <RiCheckLine className="size-3.5 text-state-success-text" />
                      ) : (
                        <RiFileCopyLine className="size-3.5" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 分割线 */}
            <div className="-mx-2.5 my-2 h-px bg-border-button-default/50" />

            {/* 2. 最近工作区 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-caption-2-semibold font-semibold tracking-wider text-text-tertiary uppercase">
                  最近工作区
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    void navigate({ to: "/settings/workspace" as "/" })
                  }}
                  className="text-caption-2-regular text-accent-600 dark:text-accent-400 hover:underline cursor-pointer"
                >
                  管理
                </button>
              </div>

              {recentWorkspaces.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {recentWorkspaces.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        void loadWorkspace(w)
                      }}
                      className="group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-background-secondary-default cursor-pointer"
                    >
                      {w.kind === "ssh" ? (
                        <RiServerLine className="size-3.5 text-chart-5 shrink-0" />
                      ) : (
                        <RiFolderLine className="size-3.5 text-text-tertiary group-hover:text-text-primary shrink-0 transition-colors" />
                      )}
                      <span className="min-w-0 flex-1 flex flex-col">
                        <span className="truncate text-caption-2-medium text-text-primary">
                          {w.name}
                        </span>
                        <span className="truncate font-mono text-caption-2-regular text-text-tertiary">
                          {w.rootPath}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="px-1 py-1 text-caption-2-regular text-text-tertiary">
                  暂无其他工作区记录
                </span>
              )}
            </div>

            {/* 分割线 */}
            <div className="-mx-2.5 my-2 h-px bg-border-button-default/50" />

            {/* 3. 快速操作 */}
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  void openFolder()
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-caption-1-medium font-medium text-text-primary transition-colors hover:bg-background-secondary-default cursor-pointer"
              >
                <RiFolderOpenLine className="size-3.5 text-text-tertiary" />
                <span>打开本地目录…</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setCreateDialogOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-caption-1-medium font-medium text-text-primary transition-colors hover:bg-background-secondary-default cursor-pointer"
              >
                <RiAddLine className="size-3.5 text-text-tertiary" />
                <span>新建 / 连接项目…</span>
              </button>
            </div>

            {/* 分割线 */}
            <div className="-mx-2.5 my-2 h-px bg-border-button-default/50" />

            {/* 4. 底栏偏好与版本 */}
            <div className="flex items-center justify-between px-1 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  void navigate({ to: "/settings/general" as "/" })
                }}
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-caption-2-medium font-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
              >
                <RiSettings3Line className="size-3.5 text-text-tertiary" />
                <span>{t("common.settings") || "偏好设置"} (⌘,)</span>
              </button>
              <span className="text-caption-2-regular font-mono text-text-tertiary">
                v0.1.6
              </span>
            </div>
          </AriaDialog>
        </AriaPopover>
      </AriaDialogTrigger>

      {/* 新建 / 连接项目弹窗 */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
