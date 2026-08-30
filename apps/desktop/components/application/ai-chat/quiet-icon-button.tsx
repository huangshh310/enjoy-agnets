"use client"

import type { ButtonHTMLAttributes, ComponentType } from "react"
import { cx } from "@/utils/cx"

type IconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export function QuietIconButton({
  icon: Icon,
  className,
  ...props
}: {
  icon: IconComponent
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-2lg",
        "text-foreground-icon-secondary",
        "outline-none transition-colors duration-150",
        "hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className
      )}
      {...props}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
