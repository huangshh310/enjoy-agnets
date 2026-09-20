/**
 * Environment 行：图标 + 标签 + 右侧数字/值。对标 Synara EnvironmentRow，皮走 BoardUI。
 */
import { useState, type ReactNode } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"

export const ENVIRONMENT_ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left text-caption-2-medium text-text-primary hover:bg-background-secondary-hover"

export function EnvironmentRow({
  icon,
  label,
  trailing,
  onClick,
  disabled
}: {
  icon: ReactNode
  label: string
  trailing?: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(ENVIRONMENT_ROW_CLASS, disabled && "cursor-default opacity-60")}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-text-secondary">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="shrink-0 text-caption-2-regular text-text-secondary">{trailing}</span> : null}
    </button>
  )
}

export function EnvironmentSectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pt-1.5 pb-0.5 text-caption-2-regular text-text-secondary">{children}</p>
}

export function EnvironmentDivider() {
  return <div className="my-1 border-t border-separator-border/70" />
}

export function EnvironmentCollapsible({
  label,
  defaultOpen = false,
  children
}: {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className={cx(ENVIRONMENT_ROW_CLASS, "text-text-secondary")}
      >
        <span className="min-w-0 flex-1 truncate text-caption-2-regular">{label}</span>
        <RiArrowDownSLine className={cx("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? children : null}
    </div>
  )
}
