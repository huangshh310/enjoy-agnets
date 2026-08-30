import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-kbd-background px-1.5 font-sans text-caption-1-semibold tracking-normal whitespace-nowrap text-kbd-foreground select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1 text-caption-1-medium text-text-tertiary", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
