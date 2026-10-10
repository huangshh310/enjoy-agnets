/**
 * 侧栏底栏用户信息：本机工作区，没有退出登录。
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
    sessionCount
  })
  return (
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
              <span className="truncate text-caption-2-regular font-mono text-text-secondary leading-tight">
                {userEmail}
              </span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center">
            <ChevronDownSmall
              className={cx(
                "size-3.5 text-text-tertiary transition-transform duration-200 ease-out group-hover:text-text-secondary",
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
          "w-[275px] max-w-[calc(100vw-32px)] origin-bottom-left",
          "overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "rounded-2xl border border-border-button-default bg-background-primary-default/95 p-2 shadow-dropdown backdrop-blur-xl",
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
  )
}
