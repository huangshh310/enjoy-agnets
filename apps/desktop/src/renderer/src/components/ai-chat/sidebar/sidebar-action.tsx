/**
 * 侧栏动作按钮与折叠文字。
 */
import { type ComponentType, type ReactNode } from "react"
import { cx } from "@/utils/cx"

export type SidebarIcon = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export function SidebarAction({
  icon: Icon,
  label,
  onClick,
  collapsed = false
}: {
  icon: SidebarIcon
  label: string
  onClick?: () => void
  collapsed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "flex items-center overflow-hidden rounded-2lg p-2 text-left transition-[width,background-color] duration-300 ease-in-out hover:bg-background-secondary-hover",
        collapsed ? "w-9 justify-center" : "w-full gap-2"
      )}
    >
      <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
      <Collapsible collapsed={collapsed}>
        <span className="text-body-medium whitespace-nowrap text-text-secondary">{label}</span>
      </Collapsible>
    </button>
  )
}

export function Collapsible({
  collapsed,
  children,
  className
}: {
  collapsed: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
        className
      )}
    >
      {children}
    </span>
  )
}
