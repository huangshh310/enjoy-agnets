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
  collapsed = false,
  active = false
}: {
  icon: SidebarIcon
  label: string
  onClick?: () => void
  collapsed?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.dataset.pointerReturn = ""
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        delete event.currentTarget.dataset.pointerReturn
      }}
      onBlur={(event) => {
        delete event.currentTarget.dataset.pointerReturn
      }}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "flex items-center overflow-hidden rounded-2lg p-2 text-left outline-none transition-all duration-200 ease-in-out cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        "data-[pointer-return]:ring-0 data-[pointer-return]:focus-visible:ring-0",
        active
          ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
        collapsed ? "w-9 justify-center" : "w-full gap-2"
      )}
    >
      <Icon
        className={cx(
          "size-5 shrink-0 transition-colors",
          active ? "text-accent-500" : "text-foreground-icon-secondary"
        )}
        aria-hidden
      />
      <Collapsible collapsed={collapsed}>
        <span
          className={cx(
            "text-body-medium whitespace-nowrap",
            active ? "text-text-primary font-semibold" : "text-text-secondary"
          )}
        >
          {label}
        </span>
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
