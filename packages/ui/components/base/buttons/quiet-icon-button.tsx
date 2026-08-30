"use client"

import type { ButtonHTMLAttributes, ComponentType } from "react"
import { Button } from "@/components/ui/button"
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
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cx("text-foreground-icon-secondary", className)}
      {...props}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  )
}
