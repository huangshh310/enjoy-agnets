import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap font-sans text-body-medium select-none button-press-motion outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-button-primary text-text-white shadow-xs disabled:text-button-primary-disabled-foreground disabled:shadow-none",
        destructive:
          "bg-button-danger text-text-white shadow-xs disabled:text-foreground-disabled-danger disabled:shadow-none",
        outline:
          "border border-border-button-default bg-background-primary-default text-text-primary shadow-xs hover:border-border-button-hover hover:bg-background-primary-hover",
        secondary:
          "border border-border-button-default bg-background-primary-default text-text-primary shadow-xs hover:border-border-button-hover hover:bg-background-primary-hover",
        ghost:
          "text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
        link: "text-accent-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 rounded-2lg p-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-sm px-2 text-caption-1-semibold has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-2 py-1.5 has-[>svg]:px-2.5",
        lg: "h-10 rounded-2lg px-4 has-[>svg]:px-4",
        icon: "size-9 rounded-2lg p-2",
        "icon-xs": "size-6 rounded-sm p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-2lg p-0",
        "icon-lg": "size-10 rounded-2lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
