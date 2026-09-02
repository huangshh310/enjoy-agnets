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
    onNavigate: (to) => void navigate({ to }),
    sessionCount
  })

  return (
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label={userName}
        className={cx(
          "flex cursor-pointer items-center overflow-hidden outline-none",
          "border-2 border-transparent transition-all duration-300 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          collapsed
            ? "size-9 justify-center rounded-full bg-transparent p-0 hover:bg-background-secondary-hover"
            : "w-full justify-between rounded-xl bg-background-tertiary-default py-2 pr-2.5 pl-2 hover:border-border-button-hover hover:bg-background-secondary-hover",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-500/10 dark:bg-accent-500/20">
            <AppMark size={24} />
          </div>
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center text-left">
              <span className="truncate text-body-medium font-medium text-text-primary">{userName}</span>
              <span className="truncate text-caption-1-regular text-text-secondary">{userEmail}</span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-background-tertiary-hover">
            <ChevronDownSmall
              className={cx(
                "size-4 text-text-secondary transition-transform duration-200 ease",
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
  )
}
