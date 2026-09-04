/**
 * 侧栏底栏用户信息与团队卡片组件。
 * 提供常驻卡片与向上弹出的详情菜单。
 */
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover
} from "react-aria-components"
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { AppMark } from "@renderer/components/brand/app-mark"
import { Collapsible } from "./sidebar-action"
import { DEFAULT_USER_EMAIL, buildUserCardMenuGroups } from "./sidebar-user-card-items"
import { SidebarUserCardMenuContent } from "./sidebar-user-card-menu"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import type { SidebarUserCardProps } from "./sidebar-user-card.types"
export function SidebarUserCard({
  collapsed = false,
  userName = "Enjoy Agents",
  userEmail = DEFAULT_USER_EMAIL,
  onOpenWorkspace,
  sessionCount = 0,
  className
}: SidebarUserCardProps) {
  const t = useT()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const menuGroups = buildUserCardMenuGroups({
    t,
    onOpenWorkspace,
    onNavigate: (to) => void navigate({ to: to as "/" }),
    onSignOut: () => {
      setIsOpen(false)
      setSignOutConfirm(true)
    },
    sessionCount
  })
  return (
    <>
      <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label={userName}
        className={cx(
          "group flex cursor-pointer items-center overflow-hidden outline-none",
          "transition-all duration-200 ease-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          collapsed
            ? "size-9 justify-center rounded-full bg-transparent p-0 hover:bg-background-secondary-hover"
            : "w-full justify-between rounded-xl px-2.5 py-1.5 border border-transparent hover:bg-background-secondary-hover hover:border-border-button-default/40 active:scale-[0.98]",
          isOpen && !collapsed && "bg-background-secondary-hover border-border-button-default/60 shadow-2xs",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 dark:bg-accent-500/20 text-accent-500">
            <AppMark size={18} />
          </div>
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center text-left">
              <span className="truncate text-caption-1-semibold text-text-primary leading-tight">{userName}</span>
              <span className="truncate text-[10.5px] font-mono text-text-tertiary leading-tight">
                {userEmail.length > 20 ? userEmail.split("@")[0] : userEmail}
              </span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center">
            <ChevronDownSmall
              className={cx(
                "size-3.5 text-text-tertiary transition-transform duration-200 ease group-hover:text-text-secondary",
                isOpen && "rotate-180"
              )}
            />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : "right bottom"}
        offset={8}
        className={cx(
          "w-[265px] max-w-[calc(100vw-32px)] origin-bottom-left overflow-y-auto",
          "rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown",
          "transition duration-150 ease-out",
          "data-entering:opacity-0 data-entering:scale-95 data-entering:blur-[2px]",
          "data-exiting:opacity-0 data-exiting:scale-95 data-exiting:blur-[2px]"
        )}
      >
        <AriaDialog aria-label={t("chat.sessionMenu") || "User menu"} className="flex flex-col outline-none">
          <SidebarUserCardMenuContent
            userName={userName}
            userEmail={userEmail}
            groups={menuGroups}
            onClose={() => setIsOpen(false)}
          />
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>

    <ConfirmDialog
      open={signOutConfirm}
      onOpenChange={setSignOutConfirm}
      title="确认退出登录"
      description="退出登录后将安全清除当前本地工作区会话凭据，您随时可以重新登录。"
      confirmLabel="退出登录"
      cancelLabel="取消"
      destructive
      onConfirm={() => {
        setSignOutConfirm(false)
        void navigate({ to: "/" })
      }}
    />
    </>
  )
}
